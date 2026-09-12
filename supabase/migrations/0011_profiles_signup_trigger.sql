-- ============================================================================
-- 0011_profiles_signup_trigger.sql
-- Stage 3.1: Authentication Foundation
--
-- Automatically creates a `profiles` row for every new Supabase Auth user.
-- This is the ONLY place a profiles row is ever created for a real user
-- account, and the ONLY place `role` is ever set at creation time -- it is
-- always hard-coded to 'employee' here. No client code (sign-up form, API
-- call, crafted request, etc.) can set or influence the role of a newly
-- created account.
--
-- Promoting a user to a higher role (admin / hr_manager / hr_staff) is out
-- of scope for this migration and is deferred to a later, separately
-- approved stage (role-management RPCs + RLS).
--
-- This migration does NOT enable Row Level Security and does NOT modify
-- migrations 0001-0010. It only adds a new function and a new trigger on
-- auth.users (Supabase's own auth schema), applying the trigger function to
-- the public schema exactly as 0007_employee_audit_triggers.sql does for
-- its own trigger functions.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    'employee'  -- hard-coded; never read from client-supplied metadata or input
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates a profiles row for every new auth.users row. role is always hard-coded to ''employee'' here and is never taken from client input -- see 0011_profiles_signup_trigger.sql header.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
