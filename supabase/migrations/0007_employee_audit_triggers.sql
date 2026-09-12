-- ============================================================================
-- 0007_employee_audit_triggers.sql
-- Server-side audit trail for the employees table. This is what replaces
-- the old app-level "buildEmployeeUpdateMessage" logic from the
-- localStorage-era Smart Activity Log — the same wording rules, but now
-- enforced by Postgres so a buggy or malicious client can never skip or
-- forge an entry.
--
-- Rules:
--   * INSERT  -> one "<name> was added to the system." entry.
--   * DELETE  -> one "<name> was removed from the system." entry. The
--                employee row is gone by the time this fires, so the FK
--                target_employee_id is left null and the id/name are kept
--                in metadata instead (a dangling FK isn't possible here).
--   * UPDATE  -> compares OLD vs NEW across the business fields only
--                (name, role, department_id, status, email, phone,
--                location, joining_date — never id/timestamps/actor
--                columns). No changed fields -> no audit row at all (this
--                is the no-op-save guard). Exactly one changed field that
--                is name/role/department/status gets field-specific
--                wording; any other single field gets generic wording;
--                more than one changed field gets a single combined entry
--                listing every changed field, never one entry per field.
-- ============================================================================

create or replace function employees_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_old_dept text;
  v_new_dept text;
  v_changed_labels text[] := array[]::text[];
  v_message text;
  v_metadata jsonb := '{}'::jsonb;
begin
  if TG_OP = 'INSERT' then
    insert into activity_logs (type, actor_id, target_employee_id, message, metadata)
    values (
      'employee-update',
      v_actor,
      NEW.id,
      format('%s was added to the system.', NEW.name),
      jsonb_build_object('event', 'created', 'employee_id', NEW.id, 'employee_name', NEW.name)
    );
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    insert into activity_logs (type, actor_id, target_employee_id, message, metadata)
    values (
      'employee-update',
      v_actor,
      null,
      format('%s was removed from the system.', OLD.name),
      jsonb_build_object('event', 'deleted', 'employee_id', OLD.id, 'employee_name', OLD.name)
    );
    return OLD;
  end if;

  -- TG_OP = 'UPDATE' from here down.

  if NEW.name is distinct from OLD.name then
    v_changed_labels := array_append(v_changed_labels, 'Name');
    v_metadata := v_metadata || jsonb_build_object('name', jsonb_build_object('from', OLD.name, 'to', NEW.name));
  end if;

  if NEW.role is distinct from OLD.role then
    v_changed_labels := array_append(v_changed_labels, 'Role');
    v_metadata := v_metadata || jsonb_build_object('role', jsonb_build_object('from', OLD.role, 'to', NEW.role));
  end if;

  if NEW.department_id is distinct from OLD.department_id then
    select name into v_old_dept from departments where id = OLD.department_id;
    select name into v_new_dept from departments where id = NEW.department_id;
    v_changed_labels := array_append(v_changed_labels, 'Department');
    v_metadata := v_metadata || jsonb_build_object('department', jsonb_build_object('from', v_old_dept, 'to', v_new_dept));
  end if;

  if NEW.status is distinct from OLD.status then
    v_changed_labels := array_append(v_changed_labels, 'Status');
    v_metadata := v_metadata || jsonb_build_object('status', jsonb_build_object('from', OLD.status, 'to', NEW.status));
  end if;

  if NEW.email is distinct from OLD.email then
    v_changed_labels := array_append(v_changed_labels, 'Email');
    v_metadata := v_metadata || jsonb_build_object('email', jsonb_build_object('from', OLD.email, 'to', NEW.email));
  end if;

  if NEW.phone is distinct from OLD.phone then
    v_changed_labels := array_append(v_changed_labels, 'Phone');
    v_metadata := v_metadata || jsonb_build_object('phone', jsonb_build_object('from', OLD.phone, 'to', NEW.phone));
  end if;

  if NEW.location is distinct from OLD.location then
    v_changed_labels := array_append(v_changed_labels, 'Location');
    v_metadata := v_metadata || jsonb_build_object('location', jsonb_build_object('from', OLD.location, 'to', NEW.location));
  end if;

  if NEW.joining_date is distinct from OLD.joining_date then
    v_changed_labels := array_append(v_changed_labels, 'Joining date');
    v_metadata := v_metadata || jsonb_build_object('joining_date', jsonb_build_object('from', OLD.joining_date, 'to', NEW.joining_date));
  end if;

  -- No-op save: nothing in the business fields actually changed. Skip.
  if array_length(v_changed_labels, 1) is null then
    return NEW;
  end if;

  if array_length(v_changed_labels, 1) = 1 and v_changed_labels[1] = 'Department' then
    v_message := format('%s''s department changed from %s to %s.', NEW.name, coalesce(v_old_dept, 'none'), coalesce(v_new_dept, 'none'));
  elsif array_length(v_changed_labels, 1) = 1 and v_changed_labels[1] = 'Status' then
    v_message := format('%s''s status changed from %s to %s.', NEW.name, OLD.status, NEW.status);
  elsif array_length(v_changed_labels, 1) = 1 and v_changed_labels[1] = 'Role' then
    v_message := format('%s''s role changed from %s to %s.', NEW.name, OLD.role, NEW.role);
  elsif array_length(v_changed_labels, 1) = 1 and v_changed_labels[1] = 'Name' then
    v_message := format('%s was renamed to %s.', OLD.name, NEW.name);
  elsif array_length(v_changed_labels, 1) = 1 then
    -- generic single-field wording (Email, Phone, Location, Joining date)
    v_message := format('%s''s %s was updated.', NEW.name, v_changed_labels[1]);
  else
    -- multi-field: one combined entry, never one row per field
    v_message := format('%s''s profile was updated: %s changed.', NEW.name, array_to_string(v_changed_labels, ', '));
  end if;

  v_metadata := v_metadata || jsonb_build_object('employee_id', NEW.id, 'employee_name', NEW.name);

  insert into activity_logs (type, actor_id, target_employee_id, message, metadata)
  values ('employee-update', v_actor, NEW.id, v_message, v_metadata);

  return NEW;
end;
$$;

drop trigger if exists employees_audit_insert on employees;
create trigger employees_audit_insert
  after insert on employees
  for each row
  execute function employees_audit_trigger();

drop trigger if exists employees_audit_update on employees;
create trigger employees_audit_update
  after update on employees
  for each row
  execute function employees_audit_trigger();

drop trigger if exists employees_audit_delete on employees;
create trigger employees_audit_delete
  after delete on employees
  for each row
  execute function employees_audit_trigger();
