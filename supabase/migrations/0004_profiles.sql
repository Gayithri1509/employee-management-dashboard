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
