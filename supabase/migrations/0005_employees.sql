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
