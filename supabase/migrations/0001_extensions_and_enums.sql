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
