-- ============================================================================
-- 0012_rls_security_foundation.sql
-- Stage 3.2A: Database Security Foundation
--
-- This migration hardens the EMS database against unauthorized access by:
--
--   1. Creating the `private` schema and a SECURITY DEFINER role-helper
--      function (private.get_my_role) that all RLS policies delegate to.
--      This is the canonical Supabase/PostgreSQL pattern for avoiding
--      recursive RLS on the profiles table: the function is owned by
--      postgres (a BYPASSRLS role), so when it reads public.profiles it
--      is not subject to the profiles RLS policy it is indirectly
--      supporting, breaking the recursion at the source.
--
--   2. Revoking Supabase's default anon/authenticated table-level grants
--      and re-granting only the minimum the application needs in this
--      phase.  anon gets nothing on any EMS business table.
--
--   3. Enabling RLS on all four EMS business tables:
--        public.profiles, public.employees,
--        public.departments, public.activity_logs
--
--   4. Creating the complete RLS policy set per the locked role model:
--        admin      → full visibility everywhere
--        hr_manager → full visibility everywhere
--        hr_staff   → read all employees/departments/logs; no mutations
--        employee   → own row only
--      Column-level restriction (e.g. role field on profiles) is NOT
--      attempted via RLS — that will come through SECURITY DEFINER RPCs
--      in a later stage.  RLS is row-level only.
--
--   5. Adding the missing index on employees(profile_id) that the
--      Employee-role SELECT path and the activity_logs EXISTS sub-query
--      both rely on.
--
-- Prerequisites:
--   Migrations 0001–0011 must be applied before this one.
--
-- Safety guarantees:
--   - Additive: no tables, columns, or rows are dropped or modified.
--   - No auth users are created, deleted, or promoted.
--   - No email addresses or secrets are hardcoded.
--   - REVOKE statements are safe to re-run (PostgreSQL emits a WARNING,
--     not an ERROR, when revoking a privilege that does not exist).
--   - DROP POLICY IF EXISTS / CREATE POLICY is used for idempotency on
--     the policy definitions.
--   - CREATE INDEX IF NOT EXISTS is idempotent.
--   - ENABLE ROW LEVEL SECURITY is safe to re-run on an already-RLS table.
-- ============================================================================


-- ============================================================================
-- PART 1 — PRIVATE SCHEMA AND ROLE HELPER
-- ============================================================================

-- Create the private schema.  PostgREST only exposes schemas listed in
-- supabase/config.toml [api].schemas ("public" and "graphql_public").
-- The private schema is therefore never reachable via the REST or GraphQL
-- APIs — it exists purely to host internal helper objects.
CREATE SCHEMA IF NOT EXISTS private;

-- Revoke PUBLIC's default access to the new schema so that no role
-- (including anon) inherits implicit USAGE from the PUBLIC pseudo-role.
REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- Allow authenticated users to resolve symbols inside this schema.
-- They will only be able to EXECUTE functions on which they hold an
-- explicit EXECUTE grant — USAGE alone is not sufficient.
GRANT USAGE ON SCHEMA private TO authenticated;


-- ============================================================================
-- private.get_my_role()
--
-- Returns the user_role of the currently authenticated user by reading
-- public.profiles directly.
--
-- Design decisions:
--
--   SECURITY DEFINER
--     Runs as the function owner (postgres, which carries BYPASSRLS in
--     Supabase).  This means the function reads public.profiles without
--     triggering the profiles RLS policy, breaking the potential
--     recursion that would otherwise occur when a profiles policy calls
--     this function, which in turn tries to read profiles.
--
--   SET search_path = ''
--     Empty search_path forces every object reference inside the body to
--     be schema-qualified, preventing search_path injection attacks that
--     could redirect lookups to attacker-controlled schemas.
--
--   (SELECT auth.uid())
--     Wrapping auth.uid() in a sub-SELECT causes PostgreSQL to evaluate
--     it as an InitPlan (once per statement) rather than once per row.
--     This is the standard Supabase performance pattern for RLS helpers.
--
--   STABLE
--     The role does not change during a single transaction; STABLE lets
--     the planner cache the result within a query.
--
--   Returns NULL
--     When no matching row exists in profiles (e.g. immediately after
--     signup before the trigger fires, or a deleted profile), the SQL
--     SELECT returns zero rows and the function returns NULL.  All RLS
--     policies that call this function treat a NULL role as "no access",
--     which is the safe default.
--
--   NOT IN public
--     The function lives in private, not public, so it is never exposed
--     via the REST or GraphQL API surface.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.get_my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role
  FROM   public.profiles
  WHERE  id = (SELECT auth.uid())
$$;

COMMENT ON FUNCTION private.get_my_role() IS
  'SECURITY DEFINER helper — reads the authenticated user''s role from '
  'public.profiles without triggering profiles RLS (owner has BYPASSRLS). '
  'Returns NULL when no profile row exists. Called only by RLS policies; '
  'never exposed via the REST/GraphQL API.';

-- Revoke the default EXECUTE that PostgreSQL grants to PUBLIC on every
-- newly created function, then grant specifically to authenticated only.
-- anon is covered by the PUBLIC revoke; the explicit anon revoke below
-- is belt-and-suspenders per the security specification.
REVOKE EXECUTE ON FUNCTION private.get_my_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.get_my_role() FROM anon;
GRANT  EXECUTE ON FUNCTION private.get_my_role() TO   authenticated;


-- ============================================================================
-- PART 2 — TABLE-LEVEL GRANTS
--
-- Supabase cloud projects default to auto_expose_new_tables = true, which
-- grants SELECT, INSERT, UPDATE, DELETE to both anon and authenticated for
-- every table in the public schema.  We revoke all of those defaults first,
-- then grant only what the application legitimately needs in this phase.
--
-- service_role is intentionally left alone: it holds its own implicit
-- full-access grant and is a server-side-only credential that must never
-- be shipped in frontend code.
-- ============================================================================

-- ---- profiles ---------------------------------------------------------------
-- anon:           no access at all
-- authenticated:  SELECT only (own row via RLS; no direct INSERT/UPDATE/DELETE)
--   INSERT → handled exclusively by the SECURITY DEFINER trigger handle_new_user()
--   UPDATE → role changes will go through an admin-only SECURITY DEFINER RPC (later stage)
--   DELETE → cascades automatically from auth.users via the FK

REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM authenticated;

GRANT SELECT ON public.profiles TO authenticated;

-- ---- employees --------------------------------------------------------------
-- anon:           no access at all
-- authenticated:  SELECT only (row-scoped by RLS role)
--   INSERT / UPDATE / DELETE deferred to the CRUD stage with controlled RPCs

REVOKE ALL ON public.employees FROM anon;
REVOKE ALL ON public.employees FROM authenticated;

GRANT SELECT ON public.employees TO authenticated;

-- ---- departments ------------------------------------------------------------
-- anon:           no access at all
-- authenticated:  SELECT (all roles), INSERT/UPDATE/DELETE (admin + hr_manager via RLS)
--   Mutation grants are intentional: the corresponding RLS policies are complete
--   and restrict mutations to admin and hr_manager.

REVOKE ALL ON public.departments FROM anon;
REVOKE ALL ON public.departments FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;

-- ---- activity_logs ----------------------------------------------------------
-- anon:           no access at all
-- authenticated:  SELECT only (row-scoped by RLS role)
--   INSERT / UPDATE / DELETE are never allowed from the client;
--   the audit trail is written exclusively by the SECURITY DEFINER
--   employees_audit_trigger() function.

REVOKE ALL ON public.activity_logs FROM anon;
REVOKE ALL ON public.activity_logs FROM authenticated;

GRANT SELECT ON public.activity_logs TO authenticated;


-- ============================================================================
-- PART 3 — ENABLE ROW LEVEL SECURITY
--
-- ENABLE ROW LEVEL SECURITY is idempotent (no-op on an already-RLS table).
-- We do NOT use FORCE ROW LEVEL SECURITY — that would subject the postgres
-- superuser to the policies too, which would break our SECURITY DEFINER
-- functions that must bypass RLS to do their work.
-- ============================================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- PART 4 — RLS POLICIES
--
-- All policies are scoped TO authenticated — the anon role is excluded
-- entirely by having no matching policy and no table grant.
--
-- Every policy uses the (SELECT private.get_my_role()) sub-select form so
-- PostgreSQL evaluates the role lookup once per statement (InitPlan), not
-- once per candidate row.  Likewise (SELECT auth.uid()) for the same reason.
--
-- Policy naming: <table>_<operation>[_<qualifier>]
-- DROP POLICY IF EXISTS before each CREATE POLICY ensures the file is safe
-- to re-apply.
-- ============================================================================


-- ============================================================================
-- 4A — PROFILES
-- ============================================================================

-- SELECT: each authenticated user may read their own profile row.
--         admin may read all profiles (needed for future user management).
--         No other roles need cross-user profile visibility in this phase.
--
-- No INSERT policy:  the SECURITY DEFINER trigger handle_new_user() inserts
--                    profile rows as postgres (BYPASSRLS); no client INSERT
--                    policy is needed or wanted.
--
-- No UPDATE policy:  role changes will be implemented as an admin-only
--                    SECURITY DEFINER RPC in a later stage.  No direct
--                    client UPDATE to profiles is permitted in this phase,
--                    which prevents self-role escalation: an authenticated
--                    user cannot UPDATE profiles SET role = 'admin'.
--
-- No DELETE policy:  profile rows are deleted automatically by the
--                    ON DELETE CASCADE FK from auth.users; no client DELETE
--                    is needed.

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Own row
    id = (SELECT auth.uid())
    OR
    -- Admin sees all profiles (future user-management panel)
    (SELECT private.get_my_role()) = 'admin'
  );


-- ============================================================================
-- 4B — EMPLOYEES
-- ============================================================================

-- SELECT:
--   admin, hr_manager, hr_staff → full employee roster
--   employee                    → only their own linked row
--                                 (employees.profile_id = auth.uid())
--   NULL role / no profile      → no rows (ELSE branch returns false)
--
-- Note: seeded employees have profile_id = NULL, so an employee-role user
-- with no linked record will see zero rows.  This is acceptable for Stage
-- 3.2A — the linking strategy is deferred to a later stage.
--
-- No INSERT / UPDATE / DELETE policies:
--   Employee CRUD is deferred to a later stage with controlled RPCs.
--   Until those policies exist, all client mutations on employees are denied
--   by RLS default-deny even though authenticated holds SELECT on the table.

DROP POLICY IF EXISTS "employees_select" ON public.employees;

CREATE POLICY "employees_select"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    -- Staff-level and above: full roster
    (SELECT private.get_my_role()) IN ('admin', 'hr_manager', 'hr_staff')
    OR
    -- Employee: own row only (profile_id linkage)
    (
      (SELECT private.get_my_role()) = 'employee'
      AND profile_id = (SELECT auth.uid())
    )
  );


-- ============================================================================
-- 4C — DEPARTMENTS
-- ============================================================================

-- SELECT:  all authenticated users (needed to populate dropdowns/filters).
-- INSERT:  admin, hr_manager
-- UPDATE:  admin, hr_manager
-- DELETE:  admin, hr_manager
-- hr_staff and employee: read-only; mutation attempts are silently rejected
--   by RLS (no matching WITH CHECK / USING → operation fails).

DROP POLICY IF EXISTS "departments_select" ON public.departments;
DROP POLICY IF EXISTS "departments_insert" ON public.departments;
DROP POLICY IF EXISTS "departments_update" ON public.departments;
DROP POLICY IF EXISTS "departments_delete" ON public.departments;

CREATE POLICY "departments_select"
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "departments_insert"
  ON public.departments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.get_my_role()) IN ('admin', 'hr_manager')
  );

CREATE POLICY "departments_update"
  ON public.departments
  FOR UPDATE
  TO authenticated
  USING     ((SELECT private.get_my_role()) IN ('admin', 'hr_manager'))
  WITH CHECK((SELECT private.get_my_role()) IN ('admin', 'hr_manager'));

CREATE POLICY "departments_delete"
  ON public.departments
  FOR DELETE
  TO authenticated
  USING (
    (SELECT private.get_my_role()) IN ('admin', 'hr_manager')
  );


-- ============================================================================
-- 4D — ACTIVITY LOGS
-- ============================================================================

-- SELECT:
--   admin, hr_manager, hr_staff → full audit trail
--   employee                    → only log entries relevant to them:
--                                   • entries where they were the actor
--                                     (actor_id = auth.uid())
--                                   • entries about their own employee row
--                                     (target_employee_id matches their linked
--                                      employees.profile_id row via EXISTS)
--
-- The EXISTS sub-query into public.employees is safe because:
--   • employees_select RLS applies and limits the employee to their own row,
--     which is exactly what the EXISTS is testing.
--   • employees_select itself calls private.get_my_role() (SECURITY DEFINER),
--     which reads profiles as postgres (BYPASSRLS) — no recursion.
--
-- No INSERT policy:  activity_logs is append-only from the server side.
--   The SECURITY DEFINER employees_audit_trigger() inserts rows as postgres;
--   no client INSERT policy is created.  Any direct INSERT attempt by an
--   authenticated client is denied by RLS default-deny.
--
-- No UPDATE / DELETE policies:  the audit trail is immutable from the client.

DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;

CREATE POLICY "activity_logs_select"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    -- Staff-level and above: full trail
    (SELECT private.get_my_role()) IN ('admin', 'hr_manager', 'hr_staff')
    OR
    -- Employee: only entries related to their own identity
    (
      (SELECT private.get_my_role()) = 'employee'
      AND (
        -- They were the actor
        actor_id = (SELECT auth.uid())
        OR
        -- The log entry targets their own employee record
        EXISTS (
          SELECT 1
          FROM   public.employees e
          WHERE  e.profile_id = (SELECT auth.uid())
            AND  e.id = activity_logs.target_employee_id
        )
      )
    )
  );


-- ============================================================================
-- PART 5 — INDEXES
--
-- Existing indexes from prior migrations (no duplicates needed):
--   idx_employees_department_id  on employees(department_id)
--   idx_employees_status         on employees(status)
--   idx_activity_logs_created_at on activity_logs(created_at desc)
--   idx_activity_logs_target_employee_id on activity_logs(target_employee_id)
--   UNIQUE on employees.email    (implicit index)
--   UNIQUE on departments.name   (implicit index)
--
-- New index required by this migration:
-- ============================================================================

-- employees(profile_id)
--   Supports two access paths introduced by the RLS policies above:
--     1. The Employee-role employees_select policy:
--        WHERE profile_id = (SELECT auth.uid())
--     2. The Employee-role activity_logs EXISTS sub-query:
--        WHERE e.profile_id = (SELECT auth.uid()) AND e.id = ...
--   Without this index both paths are full sequential scans.
--   The column is nullable; NULLs are not indexed in a B-tree by default,
--   which is fine — employee-role users only need rows where profile_id IS
--   NOT NULL and equals their own uid.

CREATE INDEX IF NOT EXISTS idx_employees_profile_id
  ON public.employees (profile_id);
