-- ============================================================================
-- 0019_employee_profile_linking.sql
-- Closes the last Employee self-service gap: there was no way to link an
-- authenticated profile to an employee record except editing the database
-- by hand. Adds a secure, admin/HR-Manager-only linking workflow.
--
-- Scope decision: "authorized HR roles" is admin + hr_manager, not
-- hr_staff. Linking changes what data an authenticated account can see
-- about itself (a self-service/access-control concern), which sits closer
-- in sensitivity to department management and status changes -- both
-- already hr_manager-and-above only -- than to hr_staff's operational
-- employee-data-entry scope. This can be loosened later; least privilege
-- first.
--
-- Design:
--   * A partial unique index enforces "one profile links to at most one
--     employee" at the schema level -- true even if every RPC below were
--     bypassed entirely (defense in depth, not just an application-level
--     check). The reverse direction ("one employee links to at most one
--     profile") is already structurally guaranteed: profile_id is a single
--     nullable column, so one employee row can never reference more than
--     one profile at a time.
--   * link_employee_profile / unlink_employee_profile are SECURITY DEFINER,
--     admin/hr_manager only, and explicitly reject a caller linking/
--     unlinking anything -- there is no code path where the 'employee'
--     role's own auth.uid() could ever satisfy the role check, so an
--     employee can never link themselves to any record, their own or
--     another's.
--   * list_linkable_profiles is a separate, narrower RPC (id/full_name/
--     email only -- no role, no last_sign_in_at) so the Employees page's
--     "Link Account" picker doesn't need the same full-admin visibility
--     list_profiles_for_admin (0016) grants -- callable by hr_manager too,
--     without widening who can reach the User & Access page itself (still
--     admin-only, unchanged).
--   * Both mutations write their own activity_logs row (type
--     'employee-update', consistent with every other employees-table
--     change) since employees_audit_trigger (0007) only diffs
--     name/role/department_id/status/email/phone/location/joining_date --
--     profile_id was never one of the tracked columns, so the generic
--     trigger fires but writes nothing for a profile_id-only change
--     (its own no-op guard). No duplicate entry is possible: the trigger
--     stays silent, only this RPC's explicit insert produces one.
-- ============================================================================

-- One profile can never be linked to more than one employee record at once.
create unique index if not exists employees_profile_id_unique
  on public.employees (profile_id)
  where profile_id is not null;


create or replace function public.link_employee_profile(
  p_employee_id uuid,
  p_target_profile_id uuid
)
returns public.employees
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role public.user_role := (select private.get_my_role());
  v_employee public.employees;
  v_conflict_count integer;
begin
  if v_caller_role is distinct from 'admin' and v_caller_role is distinct from 'hr_manager' then
    raise exception 'Only Admin or HR Manager can link an employee to a user account.';
  end if;

  select * into v_employee from public.employees where id = p_employee_id;
  if not found then
    raise exception 'Employee not found.';
  end if;

  if not exists (select 1 from public.profiles where id = p_target_profile_id) then
    raise exception 'User not found.';
  end if;

  if v_employee.profile_id is not null and v_employee.profile_id is distinct from p_target_profile_id then
    raise exception 'This employee is already linked to a different user account.';
  end if;

  select count(*) into v_conflict_count
  from public.employees
  where profile_id = p_target_profile_id
    and id <> p_employee_id;

  if v_conflict_count > 0 then
    raise exception 'This user account is already linked to a different employee record.';
  end if;

  update public.employees
     set profile_id = p_target_profile_id,
         updated_by = (select auth.uid())
   where id = p_employee_id
   returning * into v_employee;

  insert into public.activity_logs (type, actor_id, target_employee_id, message, metadata)
  values (
    'employee-update',
    (select auth.uid()),
    p_employee_id,
    format('%s''s account was linked for self-service access.', v_employee.name),
    jsonb_build_object('event', 'profile_linked', 'employee_id', p_employee_id, 'profile_id', p_target_profile_id)
  );

  return v_employee;
end;
$$;

comment on function public.link_employee_profile(uuid, uuid) is
  'Admin/HR Manager only: links an employee record to an authenticated profile for self-service access. Rejects if the employee already has a different link, or the target profile already links to a different employee (the latter also enforced by employees_profile_id_unique). Writes one employee-update activity_logs entry on success.';

revoke all on function public.link_employee_profile(uuid, uuid) from public;
revoke all on function public.link_employee_profile(uuid, uuid) from anon;
grant execute on function public.link_employee_profile(uuid, uuid) to authenticated;


create or replace function public.unlink_employee_profile(p_employee_id uuid)
returns public.employees
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role public.user_role := (select private.get_my_role());
  v_employee public.employees;
begin
  if v_caller_role is distinct from 'admin' and v_caller_role is distinct from 'hr_manager' then
    raise exception 'Only Admin or HR Manager can unlink an employee from a user account.';
  end if;

  select * into v_employee from public.employees where id = p_employee_id;
  if not found then
    raise exception 'Employee not found.';
  end if;

  if v_employee.profile_id is null then
    raise exception 'This employee is not linked to a user account.';
  end if;

  update public.employees
     set profile_id = null,
         updated_by = (select auth.uid())
   where id = p_employee_id
   returning * into v_employee;

  insert into public.activity_logs (type, actor_id, target_employee_id, message, metadata)
  values (
    'employee-update',
    (select auth.uid()),
    p_employee_id,
    format('%s''s account was unlinked from self-service access.', v_employee.name),
    jsonb_build_object('event', 'profile_unlinked', 'employee_id', p_employee_id)
  );

  return v_employee;
end;
$$;

comment on function public.unlink_employee_profile(uuid) is
  'Admin/HR Manager only: removes an employee''s self-service link. Writes one employee-update activity_logs entry on success.';

revoke all on function public.unlink_employee_profile(uuid) from public;
revoke all on function public.unlink_employee_profile(uuid) from anon;
grant execute on function public.unlink_employee_profile(uuid) to authenticated;


create or replace function public.list_linkable_profiles()
returns table (
  id uuid,
  full_name text,
  email text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role public.user_role := (select private.get_my_role());
begin
  if v_caller_role is distinct from 'admin' and v_caller_role is distinct from 'hr_manager' then
    raise exception 'Only Admin or HR Manager can view linkable accounts.';
  end if;

  return query
    select p.id, p.full_name, u.email::text
    from public.profiles p
    join auth.users u on u.id = p.id
    where not exists (
      select 1 from public.employees e where e.profile_id = p.id
    )
    order by coalesce(p.full_name, u.email::text) asc;
end;
$$;

comment on function public.list_linkable_profiles() is
  'Admin/HR Manager only: lists profiles not yet linked to any employee, for the Employees page''s "Link Account" picker. Deliberately narrower than list_profiles_for_admin (0016) -- no role, no last_sign_in_at -- and callable by hr_manager, unlike that admin-only function, without widening who can reach the User & Access page itself.';

revoke all on function public.list_linkable_profiles() from public;
revoke all on function public.list_linkable_profiles() from anon;
grant execute on function public.list_linkable_profiles() to authenticated;
