-- ============================================================================
-- 0014_update_my_profile_rpc.sql
-- Final batch: lets a signed-in user set their own display name.
--
-- Root cause of the "Admin shown by email instead of name" issue: nothing
-- in the app ever collected or let a user set profiles.full_name --
-- handle_new_user() (0011) only ever writes it from signup metadata, and
-- the sign-up form never asked for a name. This migration adds the missing
-- self-service write path; the sign-up form is also updated (application
-- code) to collect a name going forward.
--
-- Like 0013's RPCs, this exists because migration 0012 grants
-- `authenticated` SELECT-only on public.profiles -- there is no UPDATE
-- policy at all, by design (0012: "No direct client UPDATE to profiles is
-- permitted in this phase, which prevents self-role escalation"). Rather
-- than open a UPDATE policy (which would risk a future column being added
-- to profiles and forgetting to exclude it from client writes), this is a
-- narrow SECURITY DEFINER function that can only ever change full_name,
-- only on the caller's own row. It is not a general-purpose profile
-- updater and must never be widened to accept a role parameter.
-- ============================================================================

create or replace function public.update_my_profile(p_full_name text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.profiles;
begin
  update public.profiles
     set full_name = nullif(trim(p_full_name), '')
   where id = (select auth.uid())
   returning * into v_row;

  if not found then
    raise exception 'Profile not found.';
  end if;

  return v_row;
end;
$$;

comment on function public.update_my_profile(text) is
  'Self-service: updates only full_name on the caller''s own profile row (id = auth.uid()). No id parameter and no role parameter exist -- this can never target another user or change a role. Empty/whitespace-only input clears full_name (falls back to displaying the auth email).';

revoke all on function public.update_my_profile(text) from public;
revoke all on function public.update_my_profile(text) from anon;
grant execute on function public.update_my_profile(text) to authenticated;
