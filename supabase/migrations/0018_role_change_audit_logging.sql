-- ============================================================================
-- 0018_role_change_audit_logging.sql
-- Fixes the audit gap found during RBAC verification: a role change made
-- through set_user_role() (0016) never produced a Smart Activity entry,
-- because it's a profiles.role mutation, not an employees mutation --
-- employees_audit_trigger() (0007) only fires on the employees table.
--
-- This migration replaces set_user_role() with an identical-logic version
-- (same signature, same three authorization/safety checks, in the same
-- order) that additionally writes exactly one activity_logs row of the new
-- 'role-change' type (0017) after a role change actually succeeds -- never
-- before, and never on a failed/rejected attempt, since every check above
-- the insert still `raise exception`s, which rolls back the whole
-- transaction (including the profiles update) with nothing committed.
--
-- Design notes:
--   * The insert happens inside this SECURITY DEFINER function, as
--     postgres -- exactly like employees_audit_trigger() -- so it is
--     unaffected by activity_logs having no client-facing INSERT policy.
--     The frontend still cannot write to activity_logs directly; this
--     migration does not add or change any RLS policy.
--   * A no-op guard (p_role = the profile's current role) returns early
--     before the update and before the audit insert, mirroring
--     employees_audit_trigger()'s own no-op-save guard -- "changing" a
--     role to the value it already has produces no history entry.
--   * target_employee_id is resolved via employees.profile_id, exactly the
--     same lookup employees_audit_trigger() effectively relies on via the
--     FK, and is left NULL when the target profile has no linked employee
--     row -- the role change still succeeds and is still logged; only the
--     employee cross-reference is absent, with the target's identity kept
--     in the message and in metadata.target_user_id regardless.
--   * private.role_label() is a small new helper (mirrors
--     private.get_my_role()'s placement/visibility) purely so the message
--     reads "Employee"/"HR Staff"/... instead of the raw enum labels.
-- ============================================================================

create or replace function private.role_label(p_role public.user_role)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'admin' then 'Admin'
    when 'hr_manager' then 'HR Manager'
    when 'hr_staff' then 'HR Staff'
    when 'employee' then 'Employee'
  end
$$;

comment on function private.role_label(public.user_role) is
  'Human-readable label for a user_role, used only to build activity_logs.message text (e.g. set_user_role''s audit entry). Never exposed via the API.';

revoke all on function private.role_label(public.user_role) from public;
revoke all on function private.role_label(public.user_role) from anon;
grant execute on function private.role_label(public.user_role) to authenticated;


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
  v_caller_name text;
  v_target public.profiles;
  v_target_name text;
  v_target_employee_id uuid;
  v_admin_count integer;
  v_previous_role public.user_role;
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

  v_previous_role := v_target.role;

  if v_previous_role = 'admin' and p_role <> 'admin' then
    select count(*) into v_admin_count from public.profiles where role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'Cannot change this role: at least one Admin must remain.';
    end if;
  end if;

  -- No-op: nothing actually changed, so there is nothing to write or log.
  if p_role = v_previous_role then
    return v_target;
  end if;

  update public.profiles
     set role = p_role
   where id = p_user_id
   returning * into v_target;

  select coalesce(caller_profile.full_name, caller_user.email, 'An administrator')
    into v_caller_name
  from public.profiles caller_profile
  join auth.users caller_user on caller_user.id = caller_profile.id
  where caller_profile.id = v_caller_id;

  select coalesce(target_profile.full_name, target_user.email, 'a user')
    into v_target_name
  from public.profiles target_profile
  join auth.users target_user on target_user.id = target_profile.id
  where target_profile.id = p_user_id;

  select e.id into v_target_employee_id
  from public.employees e
  where e.profile_id = p_user_id
  limit 1;

  insert into public.activity_logs (type, actor_id, target_employee_id, message, metadata)
  values (
    'role-change',
    v_caller_id,
    v_target_employee_id,
    format(
      '%s changed %s''s role from %s to %s.',
      v_caller_name, v_target_name, private.role_label(v_previous_role), private.role_label(p_role)
    ),
    jsonb_build_object(
      'previous_role', v_previous_role,
      'new_role', p_role,
      'target_user_id', p_user_id,
      'target_employee_id', v_target_employee_id
    )
  );

  return v_target;
end;
$$;

comment on function public.set_user_role(uuid, public.user_role) is
  'Admin-only: changes another user''s role and writes exactly one role-change activity_logs entry on success. Cannot target the caller''s own row, cannot demote the last remaining admin, and a no-op (same role) writes neither the row nor an audit entry. Every check above the audit insert raises on failure, rolling back the whole transaction -- a rejected attempt can never produce a misleading success entry.';

revoke all on function public.set_user_role(uuid, public.user_role) from public;
revoke all on function public.set_user_role(uuid, public.user_role) from anon;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;
