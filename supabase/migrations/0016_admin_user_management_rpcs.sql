-- ============================================================================
-- 0016_admin_user_management_rpcs.sql
-- Admin User & Access management: list users (with email) and change a
-- user's role -- both admin-only, both SECURITY DEFINER, both following the
-- exact pattern 0013/0014 established.
--
-- Why an RPC is needed for listing: public.profiles has no email column
-- (email lives in auth.users, which is never exposed via the REST/GraphQL
-- API surface -- only "public" and "graphql_public" are listed in
-- supabase/config.toml's [api].schemas). A SECURITY DEFINER function is the
-- standard, safe way to let an authorized admin see a join of profiles and
-- auth.users without exposing the auth schema itself or adding a
-- denormalized email column to profiles that could drift out of sync.
--
-- Why an RPC is needed for the role change: migration 0012 grants
-- `authenticated` SELECT-only on profiles, with an explicit comment that
-- role changes would be "an admin-only SECURITY DEFINER RPC in a later
-- stage" -- this is that stage. No UPDATE policy is added; this RPC
-- remains the only client-facing way to change a role.
-- ============================================================================


-- ============================================================================
-- list_profiles_for_admin
-- ============================================================================

create or replace function public.list_profiles_for_admin()
returns table (
  id uuid,
  full_name text,
  email text,
  role public.user_role,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.get_my_role()) is distinct from 'admin' then
    raise exception 'Only Admin can view the user list.';
  end if;

  return query
    select p.id, p.full_name, u.email::text, p.role, p.created_at, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at asc;
end;
$$;

comment on function public.list_profiles_for_admin() is
  'Admin-only: lists every application user (profiles joined with auth.users for email/last_sign_in_at only -- never a password hash, token, or other auth secret). The only way the client ever sees an email outside its own account, since auth.users itself is never exposed via the API.';

revoke all on function public.list_profiles_for_admin() from public;
revoke all on function public.list_profiles_for_admin() from anon;
grant execute on function public.list_profiles_for_admin() to authenticated;


-- ============================================================================
-- set_user_role
-- ============================================================================

create or replace function public.set_user_role(
  p_user_id uuid,
  p_role public.user_role
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role public.user_role := (select private.get_my_role());
  v_caller_id uuid := (select auth.uid());
  v_target public.profiles;
  v_admin_count integer;
begin
  if v_caller_role is distinct from 'admin' then
    raise exception 'Only Admin can change a user''s role.';
  end if;

  if p_user_id = v_caller_id then
    raise exception 'You cannot change your own role.';
  end if;

  select * into v_target from public.profiles where id = p_user_id;
  if not found then
    raise exception 'User not found.';
  end if;

  -- Admin-safety: never allow the last remaining admin to be demoted. This
  -- is checked here, server-side, regardless of what the UI allows or
  -- disables -- a direct API call is subject to the same guard.
  if v_target.role = 'admin' and p_role <> 'admin' then
    select count(*) into v_admin_count from public.profiles where role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'Cannot change this role: at least one Admin must remain.';
    end if;
  end if;

  update public.profiles
     set role = p_role
   where id = p_user_id
   returning * into v_target;

  return v_target;
end;
$$;

comment on function public.set_user_role(uuid, public.user_role) is
  'Admin-only: changes another user''s role. Cannot target the caller''s own row (self-role-change is always rejected, regardless of caller role) and cannot demote the last remaining admin. This is the sole client-facing path that can ever change profiles.role -- there is no UPDATE policy on profiles.';

revoke all on function public.set_user_role(uuid, public.user_role) from public;
revoke all on function public.set_user_role(uuid, public.user_role) from anon;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;
