-- ============================================================================
-- stage-1-supabase-manual-setup.sql
--
-- Consolidated, manual-execution equivalent of the 10 versioned migrations
-- in supabase/migrations/, for pasting directly into the Supabase Dashboard
-- SQL Editor when the Supabase CLI (`supabase db push`) is not usable.
--
-- This file is a straight, in-order concatenation of the 10 migration
-- files, byte-identical to their committed content (only these separator
-- comments were added between them) -- it does not alter, reorder, or
-- reinterpret any of them. supabase/migrations/*.sql remain the source of
-- truth; this file is a convenience export of them for one-shot manual
-- application, generated on 2026-09-12.
--
-- Order (matches dependency order -- do not reorder):
--   0001 extensions/enums -> 0002 updated_at() function -> 0003 departments
--   -> 0004 profiles -> 0005 employees -> 0006 activity_logs
--   -> 0007 employee audit triggers -> 0008 seed departments
--   -> 0009 seed system activity-log entry -> 0010 seed 120 employees
--
-- Idempotency: every CREATE in this script uses `if not exists` / a
-- `do $$ ... $$` existence check, and every seed INSERT uses
-- `on conflict ... do nothing`, so re-running this whole script against a
-- database that already has Stage 1 applied is safe and makes no changes,
-- exactly like the source migrations. Nothing here weakens any constraint,
-- index, foreign key, or the audit-trigger logic.
--
-- Scope, matching Stage 1 exactly: no Row Level Security is enabled, no
-- auth.users rows are created, and no application/auth/RLS/routing work is
-- included. Run this once, then use the verification queries at the very
-- end of this file to confirm the result before doing anything else.
-- ============================================================================

-- ==========================================================================
-- SOURCE: supabase/migrations/0001_extensions_and_enums.sql
-- ==========================================================================

-- ============================================================================
-- 0001_extensions_and_enums.sql
-- Stage 1: Database Foundation
--
-- Extensions and enum types shared by later migrations. Supabase projects
-- already provide the `auth` schema (auth.users, auth.uid()) used later in
-- this migration set — nothing here creates or assumes anything about it
-- beyond referencing auth.users(id) as a foreign key target.
-- ============================================================================

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'hr_manager', 'hr_staff', 'employee');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'employee_status') then
    create type employee_status as enum ('Active', 'Inactive', 'On Leave');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_type') then
    create type activity_type as enum ('system', 'employee-update', 'auth');
  end if;
end
$$;

-- ==========================================================================
-- SOURCE: supabase/migrations/0002_updated_at_function.sql
-- ==========================================================================

-- ============================================================================
-- 0002_updated_at_function.sql
-- Reusable trigger function that keeps an `updated_at` column current on
-- every UPDATE. Attached to individual tables in their own migrations so
-- each table's migration is self-contained.
-- ============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ==========================================================================
-- SOURCE: supabase/migrations/0003_departments.sql
-- ==========================================================================

-- ============================================================================
-- 0003_departments.sql
-- Departments become a real, normalized table instead of a hardcoded
-- frontend union — see docs/database-architecture.md for the rationale.
-- ============================================================================

create table if not exists departments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

comment on table departments is
  'Normalized department list. Was a hardcoded 8-value frontend union in the localStorage-era app.';

-- ==========================================================================
-- SOURCE: supabase/migrations/0004_profiles.sql
-- ==========================================================================

-- ============================================================================
-- 0004_profiles.sql
-- One row per Supabase Auth user, carrying the RBAC role. Authentication
-- itself (Stage 3) will add the sign-up trigger that populates this table
-- automatically; Stage 1 only creates the table structure the later stage
-- depends on.
-- ============================================================================

create table if not exists profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  role       user_role not null default 'employee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is
  'One row per Supabase Auth user. role drives RBAC across the app; populated by a Stage 3 sign-up trigger, not Stage 1.';

drop trigger if exists set_profiles_updated_at on profiles;
create trigger set_profiles_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

-- ==========================================================================
-- SOURCE: supabase/migrations/0005_employees.sql
-- ==========================================================================

-- ============================================================================
-- 0005_employees.sql
-- Production employee table. See docs/database-architecture.md for how each
-- field maps back to the original localStorage-era Employee TypeScript type.
-- ============================================================================

create table if not exists employees (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text not null,                                   -- job title, distinct from profiles.role (RBAC)
  department_id uuid not null references departments (id),
  email         text not null unique,
  phone         text,
  location      text,
  status        employee_status not null default 'Active',
  joining_date  date not null,
  profile_id    uuid references profiles (id),                   -- self-service link for an Employee-role user; null for most rows today
  created_by    uuid references profiles (id),                   -- null = no authenticated actor (e.g. seed data)
  updated_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table employees is
  'Production employee records. department is now a foreign key (was a free-text union); status is a real enum (was a free-text union); joining_date is a date (was an ISO string).';
comment on column employees.created_by is 'Null when there was no authenticated actor, e.g. seed/import data.';
comment on column employees.updated_by is 'Null when there was no authenticated actor, e.g. seed/import data.';

create index if not exists idx_employees_department_id on employees (department_id);
create index if not exists idx_employees_status        on employees (status);
-- employees.email already has an index via its `unique` constraint above;
-- no separate index is created for it.

drop trigger if exists set_employees_updated_at on employees;
create trigger set_employees_updated_at
  before update on employees
  for each row
  execute function set_updated_at();

-- ==========================================================================
-- SOURCE: supabase/migrations/0006_activity_logs.sql
-- ==========================================================================

-- ============================================================================
-- 0006_activity_logs.sql
-- Append-only audit trail. Rows are written server-side by triggers on the
-- employees table (see 0007_employee_audit_triggers.sql) — the frontend
-- never inserts into this table directly, which is what makes it trustworthy
-- as an audit log rather than just an app-managed feed.
-- ============================================================================

create table if not exists activity_logs (
  id                 uuid primary key default gen_random_uuid(),
  type               activity_type not null,
  actor_id           uuid references profiles (id),   -- null = system event or no authenticated actor (e.g. seed data)
  target_employee_id uuid references employees (id) on delete set null, -- historical entries survive an employee's later deletion; see 0007's metadata for a permanent id/name record
  message            text not null,
  metadata           jsonb,
  created_at         timestamptz not null default now()
);

comment on table activity_logs is
  'Append-only audit trail. Populated by server-side triggers, never written directly by client code.';
comment on column activity_logs.actor_id is 'Null for system events or actions with no authenticated actor (e.g. seed data).';

create index if not exists idx_activity_logs_created_at         on activity_logs (created_at desc);
create index if not exists idx_activity_logs_target_employee_id on activity_logs (target_employee_id);

-- ==========================================================================
-- SOURCE: supabase/migrations/0007_employee_audit_triggers.sql
-- ==========================================================================

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

-- ==========================================================================
-- SOURCE: supabase/migrations/0008_seed_departments.sql
-- ==========================================================================

-- ============================================================================
-- 0008_seed_departments.sql
-- Seeds the 8 departments that already exist as DEPARTMENTS in
-- src/types/employee.ts, unchanged.
-- ============================================================================

insert into departments (name) values
  ('Engineering'),
  ('Design'),
  ('Product'),
  ('Marketing'),
  ('Sales'),
  ('Human Resources'),
  ('Finance'),
  ('Customer Support')
on conflict (name) do nothing;

-- ==========================================================================
-- SOURCE: supabase/migrations/0009_seed_system_activity_log.sql
-- ==========================================================================

-- ============================================================================
-- 0009_seed_system_activity_log.sql
-- Mirrors the single "Activity log initialized." system entry the
-- localStorage-era app seeded on first run, for continuity. Inserted
-- directly (not via a trigger) since it isn't tied to any employee row.
-- ============================================================================

insert into activity_logs (type, actor_id, target_employee_id, message, metadata)
select 'system', null, null, 'Activity log initialized.', jsonb_build_object('event', 'system_init')
where not exists (
  select 1 from activity_logs where type = 'system' and message = 'Activity log initialized.'
);

-- ==========================================================================
-- SOURCE: supabase/migrations/0010_seed_employees.sql
-- ==========================================================================

-- ============================================================================
-- 0010_seed_employees.sql
-- Seeds exactly 120 fictional employees: the original 12 from
-- src/data/employees.ts, preserved exactly, plus 108 additional synthetic
-- records generated deterministically (fixed random seed) by
-- generate_seed.py, documented in docs/database-architecture.md.
--
-- profile_id / created_by / updated_by are left null throughout: there is
-- no authenticated actor during seeding.
--
-- These 120 rows are synthetic bootstrap data, not real HR actions, so the
-- employees_audit_insert trigger (0007) is disabled for the duration of this
-- migration only and re-enabled immediately afterward, in the same
-- transaction. The UPDATE and DELETE audit triggers are never touched, are
-- never disabled, and remain fully active throughout — including during
-- this migration. Only the one-time bootstrap INSERT event is skipped;
-- every future employee insert/update/delete through the running
-- application is audited exactly as before, with no change to the trigger
-- function or its logic.
-- ============================================================================

begin;

alter table employees disable trigger employees_audit_insert;

insert into employees (name, role, department_id, email, phone, location, status, joining_date, profile_id, created_by, updated_by)
values
  ('Ananya Rao', 'Frontend Engineer', (select id from departments where name = 'Engineering'), 'ananya.rao@examplecorp.com', '+1 555-0101', 'Bengaluru', 'Active', '2022-03-14', null, null, null),
  ('Marcus Chen', 'Backend Engineer', (select id from departments where name = 'Engineering'), 'marcus.chen@examplecorp.com', '+1 555-0102', 'Seattle', 'Active', '2021-07-01', null, null, null),
  ('Priya Nair', 'Engineering Manager', (select id from departments where name = 'Engineering'), 'priya.nair@examplecorp.com', '+1 555-0103', 'Bengaluru', 'Active', '2019-11-20', null, null, null),
  ('Diego Fernandez', 'Product Designer', (select id from departments where name = 'Design'), 'diego.fernandez@examplecorp.com', '+1 555-0104', 'Austin', 'Active', '2023-01-09', null, null, null),
  ('Sara Kim', 'UX Researcher', (select id from departments where name = 'Design'), 'sara.kim@examplecorp.com', '+1 555-0105', 'Remote', 'On Leave', '2022-08-15', null, null, null),
  ('Michael Osei', 'Product Manager', (select id from departments where name = 'Product'), 'michael.osei@examplecorp.com', '+1 555-0106', 'New York', 'Active', '2020-05-04', null, null, null),
  ('Elena Petrova', 'Marketing Specialist', (select id from departments where name = 'Marketing'), 'elena.petrova@examplecorp.com', '+1 555-0107', 'London', 'Active', '2023-06-19', null, null, null),
  ('James Whitfield', 'Sales Executive', (select id from departments where name = 'Sales'), 'james.whitfield@examplecorp.com', '+1 555-0108', 'Chicago', 'Inactive', '2018-02-27', null, null, null),
  ('Fatima Al-Sayed', 'HR Business Partner', (select id from departments where name = 'Human Resources'), 'fatima.alsayed@examplecorp.com', '+1 555-0109', 'Dubai', 'Active', '2021-09-30', null, null, null),
  ('Tom Becker', 'Financial Analyst', (select id from departments where name = 'Finance'), 'tom.becker@examplecorp.com', '+1 555-0110', 'Berlin', 'Active', '2022-12-01', null, null, null),
  ('Grace Lin', 'Customer Support Lead', (select id from departments where name = 'Customer Support'), 'grace.lin@examplecorp.com', '+1 555-0111', 'Toronto', 'Active', '2020-10-13', null, null, null),
  ('Ryan O''Connor', 'Sales Associate', (select id from departments where name = 'Sales'), 'ryan.oconnor@examplecorp.com', '+1 555-0112', 'Chicago', 'Inactive', '2019-04-22', null, null, null),
  ('Mira Andersen', 'Product Analyst', (select id from departments where name = 'Product'), 'mira.andersen@examplecorp.com', '+1 555-0113', 'Austin', 'Active', '2015-01-16', null, null, null),
  ('Sana Weiss', 'HR Generalist', (select id from departments where name = 'Human Resources'), 'sana.weiss@examplecorp.com', '+1 555-0114', 'Dubai', 'Active', '2015-02-22', null, null, null),
  ('Emeka Wangui', 'Accountant', (select id from departments where name = 'Finance'), 'emeka.wangui@examplecorp.com', '+1 555-0115', 'Dublin', 'Active', '2015-03-31', null, null, null),
  ('Anders Kowal', 'Content Strategist', (select id from departments where name = 'Marketing'), 'anders.kowal@examplecorp.com', '+1 555-0116', 'Boston', 'Active', '2015-05-07', null, null, null),
  ('Naomi Castillo', 'Recruiter', (select id from departments where name = 'Human Resources'), 'naomi.castillo@examplecorp.com', '+1 555-0117', 'Madrid', 'Active', '2015-06-13', null, null, null),
  ('Bashir Mensah', 'Account Executive', (select id from departments where name = 'Sales'), 'bashir.mensah@examplecorp.com', '+1 555-0118', 'Remote', 'Active', '2015-07-20', null, null, null),
  ('Isla Fischer', 'Senior Product Manager', (select id from departments where name = 'Product'), 'isla.fischer@examplecorp.com', '+1 555-0119', 'Berlin', 'Active', '2015-08-26', null, null, null),
  ('Arjun Weiss', 'Marketing Manager', (select id from departments where name = 'Marketing'), 'arjun.weiss@examplecorp.com', '+1 555-0120', 'Amsterdam', 'Active', '2015-10-02', null, null, null),
  ('Greta Adeyemi', 'HR Manager', (select id from departments where name = 'Human Resources'), 'greta.adeyemi@examplecorp.com', '+1 555-0121', 'Denver', 'Active', '2015-11-08', null, null, null),
  ('Wei Diallo', 'People Ops Specialist', (select id from departments where name = 'Human Resources'), 'wei.diallo@examplecorp.com', '+1 555-0122', 'Warsaw', 'Active', '2015-12-15', null, null, null),
  ('Elsa Reyes', 'UI Designer', (select id from departments where name = 'Design'), 'elsa.reyes@examplecorp.com', '+1 555-0123', 'New York', 'Active', '2016-01-21', null, null, null),
  ('Yuki Rahman', 'Support Specialist', (select id from departments where name = 'Customer Support'), 'yuki.rahman@examplecorp.com', '+1 555-0124', 'Toronto', 'Active', '2016-02-27', null, null, null),
  ('Priyanka Weiss', 'Software Engineer', (select id from departments where name = 'Engineering'), 'priyanka.weiss@examplecorp.com', '+1 555-0125', 'Tokyo', 'Active', '2016-04-04', null, null, null),
  ('Zainab Kim', 'Product Designer', (select id from departments where name = 'Design'), 'zainab.kim@examplecorp.com', '+1 555-0126', 'Vancouver', 'Inactive', '2016-05-11', null, null, null),
  ('Omar Rahman', 'Associate Product Manager', (select id from departments where name = 'Product'), 'omar.rahman@examplecorp.com', '+1 555-0127', 'Bengaluru', 'Active', '2016-06-17', null, null, null),
  ('Chloe Kim', 'SEO Analyst', (select id from departments where name = 'Marketing'), 'chloe.kim@examplecorp.com', '+1 555-0128', 'London', 'Active', '2016-07-24', null, null, null),
  ('Otto Adeyemi', 'Sales Manager', (select id from departments where name = 'Sales'), 'otto.adeyemi@examplecorp.com', '+1 555-0129', 'Singapore', 'Inactive', '2016-08-30', null, null, null),
  ('Chidi Herrera', 'Product Ops Lead', (select id from departments where name = 'Product'), 'chidi.herrera@examplecorp.com', '+1 555-0130', 'Mumbai', 'Active', '2016-10-06', null, null, null),
  ('Kenji Salas', 'Design Lead', (select id from departments where name = 'Design'), 'kenji.salas@examplecorp.com', '+1 555-0131', 'Paris', 'Inactive', '2016-11-12', null, null, null),
  ('Bjorn Nystrom', 'Customer Success Manager', (select id from departments where name = 'Customer Support'), 'bjorn.nystrom@examplecorp.com', '+1 555-0132', 'Seattle', 'On Leave', '2016-12-19', null, null, null),
  ('Zainab Adeyemi', 'Product Analyst', (select id from departments where name = 'Product'), 'zainab.adeyemi@examplecorp.com', '+1 555-0133', 'Chicago', 'Active', '2017-01-25', null, null, null),
  ('Kenji Mattson', 'Business Development Rep', (select id from departments where name = 'Sales'), 'kenji.mattson@examplecorp.com', '+1 555-0134', 'Sydney', 'Active', '2017-03-03', null, null, null),
  ('Alessio Farah', 'Senior Software Engineer', (select id from departments where name = 'Engineering'), 'alessio.farah@examplecorp.com', '+1 555-0135', 'San Francisco', 'Active', '2017-04-09', null, null, null),
  ('Mira Diallo', 'Finance Manager', (select id from departments where name = 'Finance'), 'mira.diallo@examplecorp.com', '+1 555-0136', 'Cape Town', 'Inactive', '2017-05-16', null, null, null),
  ('Vera Nwosu', 'Sales Ops Analyst', (select id from departments where name = 'Sales'), 'vera.nwosu@examplecorp.com', '+1 555-0137', 'Austin', 'Active', '2017-06-22', null, null, null),
  ('Ivo Bergstrom', 'Account Executive', (select id from departments where name = 'Sales'), 'ivo.bergstrom@examplecorp.com', '+1 555-0138', 'Dubai', 'Active', '2017-07-29', null, null, null),
  ('Pavel Fischer', 'Technical Support Engineer', (select id from departments where name = 'Customer Support'), 'pavel.fischer@examplecorp.com', '+1 555-0139', 'Dublin', 'Active', '2017-09-04', null, null, null),
  ('Kwame Hussain', 'Brand Manager', (select id from departments where name = 'Marketing'), 'kwame.hussain@examplecorp.com', '+1 555-0140', 'Boston', 'On Leave', '2017-10-11', null, null, null),
  ('Oscar Nystrom', 'Visual Designer', (select id from departments where name = 'Design'), 'oscar.nystrom@examplecorp.com', '+1 555-0141', 'Madrid', 'Active', '2017-11-17', null, null, null),
  ('Rafael Mensah', 'Support Ops Analyst', (select id from departments where name = 'Customer Support'), 'rafael.mensah@examplecorp.com', '+1 555-0142', 'Remote', 'Active', '2017-12-24', null, null, null),
  ('Omar Kowalski', 'HR Generalist', (select id from departments where name = 'Human Resources'), 'omar.kowalski@examplecorp.com', '+1 555-0143', 'Berlin', 'Active', '2018-01-30', null, null, null),
  ('Theo Rahman', 'Payroll Specialist', (select id from departments where name = 'Finance'), 'theo.rahman@examplecorp.com', '+1 555-0144', 'Amsterdam', 'Active', '2018-03-08', null, null, null),
  ('Liam Mattson', 'Senior Product Manager', (select id from departments where name = 'Product'), 'liam.mattson@examplecorp.com', '+1 555-0145', 'Denver', 'Active', '2018-04-14', null, null, null),
  ('Mei Nwosu', 'Associate Product Manager', (select id from departments where name = 'Product'), 'mei.nwosu@examplecorp.com', '+1 555-0146', 'Warsaw', 'On Leave', '2018-05-21', null, null, null),
  ('Anya Larsen', 'Recruiter', (select id from departments where name = 'Human Resources'), 'anya.larsen@examplecorp.com', '+1 555-0147', 'New York', 'Active', '2018-06-27', null, null, null),
  ('Tariq Barros', 'Revenue Analyst', (select id from departments where name = 'Finance'), 'tariq.barros@examplecorp.com', '+1 555-0148', 'Toronto', 'Active', '2018-08-03', null, null, null),
  ('Emeka Diallo', 'Content Strategist', (select id from departments where name = 'Marketing'), 'emeka.diallo@examplecorp.com', '+1 555-0149', 'Tokyo', 'Active', '2018-09-09', null, null, null),
  ('Rafael Nystrom', 'Product Ops Lead', (select id from departments where name = 'Product'), 'rafael.nystrom@examplecorp.com', '+1 555-0150', 'Vancouver', 'Active', '2018-10-16', null, null, null),
  ('Sana Suzuki', 'Product Analyst', (select id from departments where name = 'Product'), 'sana.suzuki@examplecorp.com', '+1 555-0151', 'Bengaluru', 'Active', '2018-11-22', null, null, null),
  ('Ivo Lindqvist', 'Marketing Manager', (select id from departments where name = 'Marketing'), 'ivo.lindqvist@examplecorp.com', '+1 555-0152', 'London', 'Active', '2018-12-29', null, null, null),
  ('Mei Amara', 'Support Specialist', (select id from departments where name = 'Customer Support'), 'mei.amara@examplecorp.com', '+1 555-0153', 'Singapore', 'On Leave', '2019-02-04', null, null, null),
  ('Leila Fischer', 'HR Manager', (select id from departments where name = 'Human Resources'), 'leila.fischer@examplecorp.com', '+1 555-0154', 'Mumbai', 'Active', '2019-03-13', null, null, null),
  ('Kwame Moreno', 'UI Designer', (select id from departments where name = 'Design'), 'kwame.moreno@examplecorp.com', '+1 555-0155', 'Paris', 'Active', '2019-04-19', null, null, null),
  ('Amos Weiss', 'Sales Manager', (select id from departments where name = 'Sales'), 'amos.weiss@examplecorp.com', '+1 555-0156', 'Seattle', 'Inactive', '2019-05-26', null, null, null),
  ('Dmitri Solberg', 'Senior Product Manager', (select id from departments where name = 'Product'), 'dmitri.solberg@examplecorp.com', '+1 555-0157', 'Chicago', 'Active', '2019-07-02', null, null, null),
  ('Farah Herrera', 'SEO Analyst', (select id from departments where name = 'Marketing'), 'farah.herrera@examplecorp.com', '+1 555-0158', 'Sydney', 'Active', '2019-08-08', null, null, null),
  ('Priyanka Osman', 'Customer Success Manager', (select id from departments where name = 'Customer Support'), 'priyanka.osman@examplecorp.com', '+1 555-0159', 'San Francisco', 'Inactive', '2019-09-14', null, null, null),
  ('Lucas Ekberg', 'Business Development Rep', (select id from departments where name = 'Sales'), 'lucas.ekberg@examplecorp.com', '+1 555-0160', 'Cape Town', 'Active', '2019-10-21', null, null, null),
  ('Mei Haddad', 'QA Engineer', (select id from departments where name = 'Engineering'), 'mei.haddad@examplecorp.com', '+1 555-0161', 'Austin', 'Active', '2019-11-27', null, null, null),
  ('Elif Lindqvist', 'DevOps Engineer', (select id from departments where name = 'Engineering'), 'elif.lindqvist@examplecorp.com', '+1 555-0162', 'Dubai', 'Active', '2020-01-03', null, null, null),
  ('Farah Larsen', 'Associate Product Manager', (select id from departments where name = 'Product'), 'farah.larsen@examplecorp.com', '+1 555-0163', 'Dublin', 'On Leave', '2020-02-09', null, null, null),
  ('Wei Andersen', 'Accountant', (select id from departments where name = 'Finance'), 'wei.andersen@examplecorp.com', '+1 555-0164', 'Boston', 'Active', '2020-03-17', null, null, null),
  ('Kofi Nystrom', 'Technical Support Engineer', (select id from departments where name = 'Customer Support'), 'kofi.nystrom@examplecorp.com', '+1 555-0165', 'Madrid', 'Active', '2020-04-23', null, null, null),
  ('Alessio Diallo', 'People Ops Specialist', (select id from departments where name = 'Human Resources'), 'alessio.diallo@examplecorp.com', '+1 555-0166', 'Remote', 'Active', '2020-05-30', null, null, null),
  ('Naomi Weiss', 'Support Ops Analyst', (select id from departments where name = 'Customer Support'), 'naomi.weiss@examplecorp.com', '+1 555-0167', 'Berlin', 'Active', '2020-07-06', null, null, null),
  ('Layla Andersen', 'Brand Manager', (select id from departments where name = 'Marketing'), 'layla.andersen@examplecorp.com', '+1 555-0168', 'Amsterdam', 'Active', '2020-08-12', null, null, null),
  ('Mateo Cardoso', 'Product Ops Lead', (select id from departments where name = 'Product'), 'mateo.cardoso@examplecorp.com', '+1 555-0169', 'Denver', 'Active', '2020-09-18', null, null, null),
  ('Chloe Karim', 'Sales Ops Analyst', (select id from departments where name = 'Sales'), 'chloe.karim@examplecorp.com', '+1 555-0170', 'Warsaw', 'Inactive', '2020-10-25', null, null, null),
  ('Chloe Reyes', 'Staff Engineer', (select id from departments where name = 'Engineering'), 'chloe.reyes@examplecorp.com', '+1 555-0171', 'New York', 'Active', '2020-12-01', null, null, null),
  ('Nadia Berg', 'Content Strategist', (select id from departments where name = 'Marketing'), 'nadia.berg@examplecorp.com', '+1 555-0172', 'Toronto', 'Active', '2021-01-07', null, null, null),
  ('Chloe Iyer', 'Finance Manager', (select id from departments where name = 'Finance'), 'chloe.iyer@examplecorp.com', '+1 555-0173', 'Tokyo', 'Active', '2021-02-13', null, null, null),
  ('Bashir Volkov', 'Mobile Engineer', (select id from departments where name = 'Engineering'), 'bashir.volkov@examplecorp.com', '+1 555-0174', 'Vancouver', 'On Leave', '2021-03-22', null, null, null),
  ('Mei Njoroge', 'Product Designer', (select id from departments where name = 'Design'), 'mei.njoroge@examplecorp.com', '+1 555-0175', 'Bengaluru', 'Active', '2021-04-28', null, null, null),
  ('Bashir Kowalski', 'Payroll Specialist', (select id from departments where name = 'Finance'), 'bashir.kowalski@examplecorp.com', '+1 555-0176', 'London', 'Active', '2021-06-04', null, null, null),
  ('Mateo Nystrom', 'HR Generalist', (select id from departments where name = 'Human Resources'), 'mateo.nystrom@examplecorp.com', '+1 555-0177', 'Singapore', 'Active', '2021-07-11', null, null, null),
  ('Sakura Cardoso', 'Support Specialist', (select id from departments where name = 'Customer Support'), 'sakura.cardoso@examplecorp.com', '+1 555-0178', 'Mumbai', 'Active', '2021-08-17', null, null, null),
  ('Freya Castillo', 'Marketing Manager', (select id from departments where name = 'Marketing'), 'freya.castillo@examplecorp.com', '+1 555-0179', 'Paris', 'Active', '2021-09-23', null, null, null),
  ('Ines Ochoa', 'Account Executive', (select id from departments where name = 'Sales'), 'ines.ochoa@examplecorp.com', '+1 555-0180', 'Seattle', 'Active', '2021-10-30', null, null, null),
  ('Dmitri Yamamoto', 'Customer Success Manager', (select id from departments where name = 'Customer Support'), 'dmitri.yamamoto@examplecorp.com', '+1 555-0181', 'Chicago', 'Active', '2021-12-06', null, null, null),
  ('Nasrin Silva', 'Revenue Analyst', (select id from departments where name = 'Finance'), 'nasrin.silva@examplecorp.com', '+1 555-0182', 'Sydney', 'Active', '2022-01-12', null, null, null),
  ('Ingrid Abara', 'Software Engineer', (select id from departments where name = 'Engineering'), 'ingrid.abara@examplecorp.com', '+1 555-0183', 'San Francisco', 'Active', '2022-02-18', null, null, null),
  ('Kiran Diallo', 'Accountant', (select id from departments where name = 'Finance'), 'kiran.diallo@examplecorp.com', '+1 555-0184', 'Cape Town', 'Active', '2022-03-27', null, null, null),
  ('Freya Nasser', 'Senior Software Engineer', (select id from departments where name = 'Engineering'), 'freya.nasser@examplecorp.com', '+1 555-0185', 'Austin', 'Active', '2022-05-03', null, null, null),
  ('Bashir Reyes', 'Recruiter', (select id from departments where name = 'Human Resources'), 'bashir.reyes@examplecorp.com', '+1 555-0186', 'Dubai', 'Active', '2022-06-09', null, null, null),
  ('Amos Lindqvist', 'HR Manager', (select id from departments where name = 'Human Resources'), 'amos.lindqvist@examplecorp.com', '+1 555-0187', 'Dublin', 'Active', '2022-07-16', null, null, null),
  ('Hiro Larsen', 'Sales Manager', (select id from departments where name = 'Sales'), 'hiro.larsen@examplecorp.com', '+1 555-0188', 'Boston', 'On Leave', '2022-08-22', null, null, null),
  ('Liam Nasser', 'SEO Analyst', (select id from departments where name = 'Marketing'), 'liam.nasser@examplecorp.com', '+1 555-0189', 'Madrid', 'Active', '2022-09-28', null, null, null),
  ('Zainab Barros', 'QA Engineer', (select id from departments where name = 'Engineering'), 'zainab.barros@examplecorp.com', '+1 555-0190', 'Remote', 'Active', '2022-11-04', null, null, null),
  ('Amos Karim', 'Technical Support Engineer', (select id from departments where name = 'Customer Support'), 'amos.karim@examplecorp.com', '+1 555-0191', 'Berlin', 'Active', '2022-12-11', null, null, null),
  ('Nasrin Okafor', 'Product Analyst', (select id from departments where name = 'Product'), 'nasrin.okafor@examplecorp.com', '+1 555-0192', 'Amsterdam', 'Active', '2023-01-17', null, null, null),
  ('Wei Barros', 'Design Lead', (select id from departments where name = 'Design'), 'wei.barros@examplecorp.com', '+1 555-0193', 'Denver', 'Active', '2023-02-23', null, null, null),
  ('Elsa Farah', 'Brand Manager', (select id from departments where name = 'Marketing'), 'elsa.farah@examplecorp.com', '+1 555-0194', 'Warsaw', 'Active', '2023-04-01', null, null, null),
  ('Sven Kim', 'Visual Designer', (select id from departments where name = 'Design'), 'sven.kim@examplecorp.com', '+1 555-0195', 'New York', 'On Leave', '2023-05-08', null, null, null),
  ('Zainab Nwosu', 'Senior Product Manager', (select id from departments where name = 'Product'), 'zainab.nwosu@examplecorp.com', '+1 555-0196', 'Toronto', 'Active', '2023-06-14', null, null, null),
  ('Rosa Sato', 'Support Ops Analyst', (select id from departments where name = 'Customer Support'), 'rosa.sato@examplecorp.com', '+1 555-0197', 'Tokyo', 'Active', '2023-07-21', null, null, null),
  ('Vera Barros', 'People Ops Specialist', (select id from departments where name = 'Human Resources'), 'vera.barros@examplecorp.com', '+1 555-0198', 'Vancouver', 'Active', '2023-08-27', null, null, null),
  ('Elsa Nystrom', 'Content Strategist', (select id from departments where name = 'Marketing'), 'elsa.nystrom@examplecorp.com', '+1 555-0199', 'Bengaluru', 'Active', '2023-10-03', null, null, null),
  ('Sofia Lindberg', 'Business Development Rep', (select id from departments where name = 'Sales'), 'sofia.lindberg@examplecorp.com', '+1 555-0200', 'London', 'Active', '2023-11-09', null, null, null),
  ('Ingrid Silva', 'UI Designer', (select id from departments where name = 'Design'), 'ingrid.silva@examplecorp.com', '+1 555-0201', 'Singapore', 'Active', '2023-12-16', null, null, null),
  ('Wei Zhang', 'Finance Manager', (select id from departments where name = 'Finance'), 'wei.zhang@examplecorp.com', '+1 555-0202', 'Mumbai', 'On Leave', '2024-01-22', null, null, null),
  ('Amos Sato', 'Payroll Specialist', (select id from departments where name = 'Finance'), 'amos.sato@examplecorp.com', '+1 555-0203', 'Paris', 'On Leave', '2024-02-28', null, null, null),
  ('Layla Hussain', 'Product Designer', (select id from departments where name = 'Design'), 'layla.hussain@examplecorp.com', '+1 555-0204', 'Seattle', 'Inactive', '2024-04-05', null, null, null),
  ('Freya Suzuki', 'Revenue Analyst', (select id from departments where name = 'Finance'), 'freya.suzuki@examplecorp.com', '+1 555-0205', 'Chicago', 'On Leave', '2024-05-12', null, null, null),
  ('Rafael Kim', 'DevOps Engineer', (select id from departments where name = 'Engineering'), 'rafael.kim@examplecorp.com', '+1 555-0206', 'Sydney', 'Active', '2024-06-18', null, null, null),
  ('Sakura Salas', 'Design Lead', (select id from departments where name = 'Design'), 'sakura.salas@examplecorp.com', '+1 555-0207', 'San Francisco', 'Active', '2024-07-25', null, null, null),
  ('Noah Nasser', 'Visual Designer', (select id from departments where name = 'Design'), 'noah.nasser@examplecorp.com', '+1 555-0208', 'Cape Town', 'Inactive', '2024-08-31', null, null, null),
  ('Anya Kim', 'Support Specialist', (select id from departments where name = 'Customer Support'), 'anya.kim@examplecorp.com', '+1 555-0209', 'Austin', 'Active', '2024-10-07', null, null, null),
  ('Zainab Silva', 'Accountant', (select id from departments where name = 'Finance'), 'zainab.silva@examplecorp.com', '+1 555-0210', 'Dubai', 'Active', '2024-11-13', null, null, null),
  ('Chloe Ekberg', 'Customer Success Manager', (select id from departments where name = 'Customer Support'), 'chloe.ekberg@examplecorp.com', '+1 555-0211', 'Dublin', 'Inactive', '2024-12-20', null, null, null),
  ('Kofi Karim', 'Finance Manager', (select id from departments where name = 'Finance'), 'kofi.karim@examplecorp.com', '+1 555-0212', 'Boston', 'Active', '2025-01-26', null, null, null),
  ('Naomi Bergstrom', 'Marketing Manager', (select id from departments where name = 'Marketing'), 'naomi.bergstrom@examplecorp.com', '+1 555-0213', 'Madrid', 'Active', '2025-03-04', null, null, null),
  ('Omar Nwosu', 'Staff Engineer', (select id from departments where name = 'Engineering'), 'omar.nwosu@examplecorp.com', '+1 555-0214', 'Remote', 'Active', '2025-04-10', null, null, null),
  ('Hiro Barros', 'HR Generalist', (select id from departments where name = 'Human Resources'), 'hiro.barros@examplecorp.com', '+1 555-0215', 'Berlin', 'Active', '2025-05-17', null, null, null),
  ('Farah Karim', 'Recruiter', (select id from departments where name = 'Human Resources'), 'farah.karim@examplecorp.com', '+1 555-0216', 'Amsterdam', 'Active', '2025-06-23', null, null, null),
  ('Kwame Petrov', 'Sales Ops Analyst', (select id from departments where name = 'Sales'), 'kwame.petrov@examplecorp.com', '+1 555-0217', 'Denver', 'Active', '2025-07-30', null, null, null),
  ('Sana Njoroge', 'UI Designer', (select id from departments where name = 'Design'), 'sana.njoroge@examplecorp.com', '+1 555-0218', 'Warsaw', 'Active', '2025-09-05', null, null, null),
  ('Amos Andersen', 'Account Executive', (select id from departments where name = 'Sales'), 'amos.andersen@examplecorp.com', '+1 555-0219', 'New York', 'Active', '2025-10-12', null, null, null),
  ('Sofia Solberg', 'Mobile Engineer', (select id from departments where name = 'Engineering'), 'sofia.solberg@examplecorp.com', '+1 555-0220', 'Toronto', 'Active', '2025-11-18', null, null, null)
on conflict (email) do nothing;

alter table employees enable trigger employees_audit_insert;

commit;

-- ============================================================================
-- VERIFICATION -- run these after the script above completes.
-- All read-only SELECTs; none of these modify any data.
-- ============================================================================

-- 1. Department count (expect 8)
select count(*) as department_count from departments;

-- 2. Employee count (expect 120)
select count(*) as employee_count from employees;

-- 3. Status distribution (expect Active 96, Inactive 12, On Leave 12)
select status, count(*) as count
from employees
group by status
order by status;

-- 4. Activity log count (expect exactly 1) and its content
select count(*) as activity_log_count from activity_logs;

select type, actor_id, target_employee_id, message
from activity_logs;
-- expect exactly one row: type = 'system', actor_id = null,
-- target_employee_id = null, message = 'Activity log initialized.'

-- 5. Profiles count (expect 0 -- no fake profiles were created)
select count(*) as profiles_count from profiles;

-- 6. auth.users count (expect 0 -- no fake auth users were created)
select count(*) as auth_users_count from auth.users;

-- 7. Employee audit + updated_at triggers exist and are enabled
--    (tgenabled = 'O' means enabled; expect all four rows back with 'O')
select tgname, tgenabled
from pg_trigger
where tgrelid = 'employees'::regclass
  and not tgisinternal
order by tgname;
-- expect: employees_audit_delete   | O
--         employees_audit_insert   | O
--         employees_audit_update   | O
--         set_employees_updated_at | O

-- 8. RLS still disabled on all four Stage-1 tables (expect relrowsecurity = f for all)
select relname, relrowsecurity
from pg_class
where relname in ('departments', 'profiles', 'employees', 'activity_logs')
order by relname;
