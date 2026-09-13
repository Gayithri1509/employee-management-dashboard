-- ============================================================================
-- 0015_friendlier_rpc_messages.sql
-- Final batch, Step 3 (understandable errors) + Step 4 (UI polish).
--
-- Purely cosmetic: replaces the six 0013 RPCs with byte-identical logic and
-- only their user-facing RAISE EXCEPTION text changed, from lowercase/
-- jargon-y ("insufficient_privilege: hr_staff cannot change an employee's
-- department") to plain, capitalized sentences a normal user can read
-- ("HR Staff can't change an employee's department."). No permission
-- check, column rule, or authorization logic changes in any way -- every
-- `if`/role comparison below is identical to 0013.
--
-- 0013 itself is left untouched, per this project's migration convention
-- (never edit an already-applied migration); CREATE OR REPLACE FUNCTION
-- here simply supersedes those six function bodies in place.
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
    raise exception 'Only Admin, HR Manager, or HR Staff can create employees.';
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
    raise exception 'Only Admin, HR Manager, or HR Staff can edit employees.';
  end if;

  select * into v_current from public.employees where id = p_id;
  if not found then
    raise exception 'Employee not found.';
  end if;

  if v_role = 'hr_staff' and p_department_id is distinct from v_current.department_id then
    raise exception 'HR Staff can''t change an employee''s department.';
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
    raise exception 'Only Admin or HR Manager can change an employee''s status.';
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
    raise exception 'Only Admin can delete employees.';
  end if;

  delete from public.employees where id = p_id returning * into v_row;

  if not found then
    raise exception 'Employee not found.';
  end if;

  return v_row;
end;
$$;

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
    raise exception 'Only the Employee role can use self-service profile updates.';
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
    raise exception 'Only Admin or HR Manager can reassign employees between departments.';
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
