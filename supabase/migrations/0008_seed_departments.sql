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
