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
