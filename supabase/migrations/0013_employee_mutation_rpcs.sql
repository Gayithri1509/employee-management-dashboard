-- ============================================================================
-- 0013_employee_mutation_rpcs.sql
-- Phase 2: Employee mutation security (CRUD + self-service)
--
-- Migration 0012 enabled RLS and granted `authenticated` SELECT-only access
-- to public.employees -- no INSERT/UPDATE/DELETE policy exists there, so a
-- direct PostgREST table mutation on employees is denied for every role.
-- That was deliberate: RLS is row-level, but the required permission model
-- needs COLUMN-level rules too (e.g. hr_staff may edit an employee's phone
-- but not their department; an employee may edit only their own phone/
-- location). This migration adds SECURITY DEFINER RPC functions -- the
-- only client-facing way to mutate public.employees from here on -- each
-- enforcing its own role/column rules before performing the write.
--
-- Every function:
--   * is SECURITY DEFINER (owned by postgres, which carries BYPASSRLS in
--     Supabase), so it can write to public.employees despite employees
--     having no client-facing mutation policy;
--   * uses SET search_path = '' with fully schema-qualified references,
--     the same search_path-injection defense as private.get_my_role();
--   * calls (SELECT private.get_my_role()) to authorize the caller -- the
--     same recursion-safe helper 0012 introduced for RLS policies;
--   * sets created_by/updated_by from (SELECT auth.uid()) itself -- never
--     from a client-supplied parameter, so an actor can never forge who
--     performed a change;
--   * performs a normal INSERT/UPDATE/DELETE on public.employees, which
--     the existing employees_audit_trigger() (0007) fires for exactly as
--     it would for any other write -- no activity_logs row is written by
--     this migration or by any frontend code, preserving "audit trail
--     lives in the database, not the client" from 0007's own design.
--
-- Column-level rules implemented here:
--   * create_employee            -- admin, hr_manager, hr_staff
--   * update_employee            -- admin, hr_manager, hr_staff; hr_staff
--                                    may not change department_id (409/403
--                                    via a raised exception if attempted)
--   * set_employee_status        -- admin, hr_manager only (deactivate/
--                                    reactivate/other status changes)
--   * delete_employee            -- admin only (hard delete)
--   * update_employee_self       -- employee only; targets ONLY the row
--                                    where employees.profile_id =
--                                    auth.uid() -- no id parameter exists,
--                                    so an employee can never target
--                                    another employee's row; phone/location
--                                    only
--   * reassign_department_employees -- admin, hr_manager only; bulk-moves
--                                    every employee from one department to
--                                    another (used by the Departments UI's
--                                    safe-deletion flow so a department
--                                    can never be deleted out from under
--                                    its employees)
--
-- No hardcoded user ids or emails; no privilege escalation path; no
-- broad grants -- EXECUTE is revoked from PUBLIC/anon and granted only to
-- authenticated, exactly as 0012 did for private.get_my_role().
--
-- Prerequisites: migrations 0001-0012 applied. Does not modify 0012 or any
-- earlier migration, and does not touch RLS policies -- it only adds new
-- functions.
-- ============================================================================


-- ============================================================================
-- create_employee
-- ============================================================================

create or replace function public.create_employee(
  p_name text,
  p_role text,
  p_department_id uuid,
  p_email text,
  p_phone text,
  p_location text,
  p_joining_date date
)
returns public.employees
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := (select private.get_my_role());
  v_row public.employees;
begin
  if v_role is null or v_role not in ('admin', 'hr_manager', 'hr_staff') then
    raise exception 'insufficient_privilege: only admin, hr_manager, or hr_staff may create employees';
  end if;

  insert into public.employees
    (name, role, department_id, email, phone, location, joining_date, created_by, updated_by)
  values
    (p_name, p_role, p_department_id, p_email, p_phone, p_location, p_joining_date,
     (select auth.uid()), (select auth.uid()))
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'An employee with this email already exists.';
end;
$$;

comment on function public.create_employee(text, text, uuid, text, text, text, date) is
  'Creates an employee. admin/hr_manager/hr_staff only. status always defaults to Active; created_by/updated_by are always the caller, never client-supplied.';

revoke all on function public.create_employee(text, text, uuid, text, text, text, date) from public;
revoke all on function public.create_employee(text, text, uuid, text, text, text, date) from anon;
grant execute on function public.create_employee(text, text, uuid, text, text, text, date) to authenticated;


-- ============================================================================
-- update_employee
-- ============================================================================

create or replace function public.update_employee(
  p_id uuid,
  p_name text,
  p_role text,
  p_department_id uuid,
  p_email text,
  p_phone text,
  p_location text,
  p_joining_date date
)
returns public.employees
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := (select private.get_my_role());
  v_current public.employees;
  v_row public.employees;
begin
  if v_role is null or v_role not in ('admin', 'hr_manager', 'hr_staff') then
    raise exception 'insufficient_privilege: only admin, hr_manager, or hr_staff may edit employees';
  end if;

  select * into v_current from public.employees where id = p_id;
  if not found then
    raise exception 'Employee not found.';
  end if;

  if v_role = 'hr_staff' and p_department_id is distinct from v_current.department_id then
    raise exception 'insufficient_privilege: hr_staff cannot change an employee''s department';
  end if;

  update public.employees
     set name          = p_name,
         role          = p_role,
         department_id = p_department_id,
         email         = p_email,
         phone         = p_phone,
         location      = p_location,
         joining_date  = p_joining_date,
         updated_by    = (select auth.uid())
   where id = p_id
   returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'An employee with this email already exists.';
end;
$$;

comment on function public.update_employee(uuid, text, text, uuid, text, text, text, date) is
  'Edits an employee''s operational fields. admin/hr_manager/hr_staff only. hr_staff may not change department_id -- attempting to raises an exception rather than silently dropping the change. Status is changed only via set_employee_status.';

revoke all on function public.update_employee(uuid, text, text, uuid, text, text, text, date) from public;
revoke all on function public.update_employee(uuid, text, text, uuid, text, text, text, date) from anon;
grant execute on function public.update_employee(uuid, text, text, uuid, text, text, text, date) to authenticated;


-- ============================================================================
-- set_employee_status
-- ============================================================================

create or replace function public.set_employee_status(
  p_id uuid,
  p_status public.employee_status
)
returns public.employees
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := (select private.get_my_role());
  v_row public.employees;
begin
  if v_role is null or v_role not in ('admin', 'hr_manager') then
    raise exception 'insufficient_privilege: only admin or hr_manager may change employee status';
  end if;

  update public.employees
     set status     = p_status,
         updated_by = (select auth.uid())
   where id = p_id
   returning * into v_row;

  if not found then
    raise exception 'Employee not found.';
  end if;

  return v_row;
end;
$$;

comment on function public.set_employee_status(uuid, public.employee_status) is
  'Deactivates/reactivates/otherwise changes an employee''s status. admin/hr_manager only -- hr_staff has no execute grant on this function.';

revoke all on function public.set_employee_status(uuid, public.employee_status) from public;
revoke all on function public.set_employee_status(uuid, public.employee_status) from anon;
grant execute on function public.set_employee_status(uuid, public.employee_status) to authenticated;


-- ============================================================================
-- delete_employee
-- ============================================================================

create or replace function public.delete_employee(p_id uuid)
returns public.employees
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := (select private.get_my_role());
  v_row public.employees;
begin
  if v_role is null or v_role <> 'admin' then
    raise exception 'insufficient_privilege: only admin may delete employees';
  end if;

  delete from public.employees where id = p_id returning * into v_row;

  if not found then
    raise exception 'Employee not found.';
  end if;

  return v_row;
end;
$$;

comment on function public.delete_employee(uuid) is
  'Hard-deletes an employee. admin only. The existing employees_audit_delete trigger records the removal; activity_logs.target_employee_id is left null by that trigger since the row no longer exists.';

revoke all on function public.delete_employee(uuid) from public;
revoke all on function public.delete_employee(uuid) from anon;
grant execute on function public.delete_employee(uuid) to authenticated;


-- ============================================================================
-- update_employee_self
-- ============================================================================

create or replace function public.update_employee_self(
  p_phone text,
  p_location text
)
returns public.employees
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := (select private.get_my_role());
  v_row public.employees;
begin
  if v_role is null or v_role <> 'employee' then
    raise exception 'insufficient_privilege: only an employee-role user may use self-service update';
  end if;

  update public.employees
     set phone      = p_phone,
         location   = p_location,
         updated_by = (select auth.uid())
   where profile_id = (select auth.uid())
   returning * into v_row;

  if not found then
    raise exception 'No employee record is linked to your account.';
  end if;

  return v_row;
end;
$$;

comment on function public.update_employee_self(text, text) is
  'Employee self-service: updates only phone/location on the caller''s own linked employee row (profile_id = auth.uid()). There is no employee-id parameter, so a caller can never target another employee''s row. Every other column (name, role, department_id, email, status, joining_date, profile_id, created_by, updated_by) is untouchable through this function.';

revoke all on function public.update_employee_self(text, text) from public;
revoke all on function public.update_employee_self(text, text) from anon;
grant execute on function public.update_employee_self(text, text) to authenticated;


-- ============================================================================
-- reassign_department_employees
-- ============================================================================

create or replace function public.reassign_department_employees(
  p_from_department_id uuid,
  p_to_department_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := (select private.get_my_role());
  v_count integer;
begin
  if v_role is null or v_role not in ('admin', 'hr_manager') then
    raise exception 'insufficient_privilege: only admin or hr_manager may reassign employees between departments';
  end if;

  if p_from_department_id = p_to_department_id then
    raise exception 'Source and destination departments must be different.';
  end if;

  update public.employees
     set department_id = p_to_department_id,
         updated_by    = (select auth.uid())
   where department_id = p_from_department_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.reassign_department_employees(uuid, uuid) is
  'Bulk-moves every employee from one department to another. admin/hr_manager only. Used by the Departments UI to empty a department before deleting it, so a department can never be deleted while employees still reference it. Returns the number of employees moved; fires employees_audit_update once per moved row via the existing trigger.';

revoke all on function public.reassign_department_employees(uuid, uuid) from public;
revoke all on function public.reassign_department_employees(uuid, uuid) from anon;
grant execute on function public.reassign_department_employees(uuid, uuid) to authenticated;
