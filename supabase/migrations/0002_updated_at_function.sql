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
