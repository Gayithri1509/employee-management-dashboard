-- ============================================================================
-- verify_rls_0012.sql
-- Stage 3.2A — Manual Verification for 0012_rls_security_foundation.sql
--
-- HOW TO USE
-- ----------
-- Run this file in the Supabase SQL Editor (connected as the postgres role)
-- AFTER applying migration 0012_rls_security_foundation.sql.
--
-- The structural checks (Section A) are fully automated — they query
-- pg_catalog and information_schema and return a result table with a
-- `passed` boolean column.  Every row must show passed = true before
-- proceeding.
--
-- The behavioral checks (Section B) describe manual steps you can perform
-- in Supabase SQL Editor or via the client to verify that the policies
-- actually enforce the role model at runtime.
--
-- No pgTAP or external test framework is required.
-- ============================================================================


-- ============================================================================
-- SECTION A — STRUCTURAL VERIFICATION
-- Run each block independently and confirm every `passed` column is true.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- A.1  Private schema exists and is NOT exposed via API
-- ----------------------------------------------------------------------------

SELECT
  'A.1  private schema exists'                        AS test,
  EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'private'
  )                                                   AS passed;

-- Expected: passed = true


-- ----------------------------------------------------------------------------
-- A.2  private.get_my_role() exists with correct attributes
-- ----------------------------------------------------------------------------

SELECT
  'A.2a get_my_role exists'                           AS test,
  EXISTS (
    SELECT 1
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'private'
      AND  p.proname = 'get_my_role'
  )                                                   AS passed

UNION ALL

SELECT
  'A.2b get_my_role is SECURITY DEFINER'              AS test,
  EXISTS (
    SELECT 1
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'private'
      AND  p.proname = 'get_my_role'
      AND  p.prosecdef = true       -- prosecdef = true means SECURITY DEFINER
  )                                                   AS passed

UNION ALL

SELECT
  'A.2c get_my_role is STABLE'                        AS test,
  EXISTS (
    SELECT 1
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'private'
      AND  p.proname = 'get_my_role'
      AND  p.provolatile = 's'      -- 's' = STABLE
  )                                                   AS passed

UNION ALL

SELECT
  'A.2d get_my_role has empty search_path'            AS test,
  EXISTS (
    SELECT 1
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace,
           LATERAL unnest(p.proconfig) AS cfg
    WHERE  n.nspname = 'private'
      AND  p.proname = 'get_my_role'
      AND  cfg IN ('search_path=', 'search_path=""')
      -- PostgreSQL serializes SET search_path = '' as 'search_path=""'
      -- (double-quoted empty string in GUC list format).
      -- 'search_path=' is included for forward-compatibility with any
      -- PostgreSQL version that uses bare-empty serialization.
  )                                                   AS passed;

-- Expected: all rows passed = true


-- ----------------------------------------------------------------------------
-- A.3  get_my_role() EXECUTE privileges
-- ----------------------------------------------------------------------------

SELECT
  'A.3a anon cannot EXECUTE get_my_role'              AS test,
  NOT EXISTS (
    SELECT 1
    FROM   information_schema.routine_privileges
    WHERE  routine_schema    = 'private'
      AND  routine_name      = 'get_my_role'
      AND  grantee           = 'anon'
      AND  privilege_type    = 'EXECUTE'
  )                                                   AS passed

UNION ALL

SELECT
  'A.3b authenticated can EXECUTE get_my_role'        AS test,
  EXISTS (
    SELECT 1
    FROM   information_schema.routine_privileges
    WHERE  routine_schema    = 'private'
      AND  routine_name      = 'get_my_role'
      AND  grantee           = 'authenticated'
      AND  privilege_type    = 'EXECUTE'
  )                                                   AS passed;

-- Expected: both rows passed = true


-- ----------------------------------------------------------------------------
-- A.4  RLS is enabled on all four business tables
-- ----------------------------------------------------------------------------

SELECT
  'A.4  RLS enabled on ' || relname                   AS test,
  relrowsecurity                                       AS passed
FROM   pg_class
WHERE  relname IN ('profiles', 'employees', 'departments', 'activity_logs')
  AND  relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER  BY relname;

-- Expected: four rows, all passed = true


-- ----------------------------------------------------------------------------
-- A.5  Expected RLS policies exist (by name and table)
-- ----------------------------------------------------------------------------

WITH expected_policies (tablename, policyname) AS (
  VALUES
    ('profiles',      'profiles_select'),
    ('employees',     'employees_select'),
    ('departments',   'departments_select'),
    ('departments',   'departments_insert'),
    ('departments',   'departments_update'),
    ('departments',   'departments_delete'),
    ('activity_logs', 'activity_logs_select')
)
SELECT
  'A.5  policy exists: ' || e.tablename || '.' || e.policyname  AS test,
  EXISTS (
    SELECT 1
    FROM   pg_policies p
    WHERE  p.schemaname = 'public'
      AND  p.tablename  = e.tablename
      AND  p.policyname = e.policyname
  )                                                              AS passed
FROM expected_policies e
ORDER BY e.tablename, e.policyname;

-- Expected: 7 rows, all passed = true


-- ----------------------------------------------------------------------------
-- A.6  Policies are scoped to the `authenticated` role only
-- ----------------------------------------------------------------------------

SELECT
  'A.6  policy roles are authenticated only: ' || tablename || '.' || policyname  AS test,
  roles = '{authenticated}'                          AS passed
  -- passed = true only when roles is exactly the single-element array {authenticated}.
  -- Any other value fails: {}, {public}, {anon}, {authenticated,anon}, or any
  -- other combination.  An empty array {} would mean the policy applies to ALL
  -- roles, which is a misconfiguration.
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'employees', 'departments', 'activity_logs')
ORDER BY tablename, policyname;

-- Expected: all rows passed = true.
-- passed = false means the policy is scoped to an unexpected role combination.


-- ----------------------------------------------------------------------------
-- A.7  anon has NO table privileges on EMS business tables
-- ----------------------------------------------------------------------------

SELECT
  'A.7  anon has no privilege on ' || table_name     AS test,
  false                                               AS passed,
  privilege_type                                      AS unexpected_privilege
FROM   information_schema.role_table_grants
WHERE  grantee     = 'anon'
  AND  table_schema = 'public'
  AND  table_name  IN ('profiles', 'employees', 'departments', 'activity_logs')

UNION ALL

SELECT
  'A.7  anon correctly has no privileges'             AS test,
  true                                                AS passed,
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM   information_schema.role_table_grants
  WHERE  grantee     = 'anon'
    AND  table_schema = 'public'
    AND  table_name  IN ('profiles', 'employees', 'departments', 'activity_logs')
);

-- Expected: single row "anon correctly has no privileges", passed = true.
-- Any additional rows with passed = false indicate a grant that should be revoked.


-- ----------------------------------------------------------------------------
-- A.8  authenticated table privileges match the specification
-- ----------------------------------------------------------------------------

WITH expected_grants (table_name, privilege_type) AS (
  VALUES
    -- profiles: SELECT only
    ('profiles',      'SELECT'),
    -- employees: SELECT only (CRUD deferred)
    ('employees',     'SELECT'),
    -- departments: SELECT + mutations (controlled by RLS)
    ('departments',   'SELECT'),
    ('departments',   'INSERT'),
    ('departments',   'UPDATE'),
    ('departments',   'DELETE'),
    -- activity_logs: SELECT only (append-only via triggers)
    ('activity_logs', 'SELECT')
),
actual_grants AS (
  SELECT table_name, privilege_type
  FROM   information_schema.role_table_grants
  WHERE  grantee      = 'authenticated'
    AND  table_schema = 'public'
    AND  table_name   IN ('profiles', 'employees', 'departments', 'activity_logs')
)
SELECT
  'A.8  authenticated has expected grant: ' || e.table_name || ' ' || e.privilege_type  AS test,
  EXISTS (
    SELECT 1 FROM actual_grants a
    WHERE  a.table_name     = e.table_name
      AND  a.privilege_type = e.privilege_type
  )                                                                                       AS passed
FROM expected_grants e

UNION ALL

-- Check for unexpected grants (anything beyond what we explicitly set)
SELECT
  'A.8  unexpected grant on authenticated: ' || a.table_name || ' ' || a.privilege_type  AS test,
  false                                                                                    AS passed
FROM actual_grants a
WHERE NOT EXISTS (
  SELECT 1 FROM expected_grants e
  WHERE  e.table_name     = a.table_name
    AND  e.privilege_type = a.privilege_type
)
ORDER BY test;

-- Expected: 7 rows for expected grants (all passed = true).
-- No rows for unexpected grants.


-- ----------------------------------------------------------------------------
-- A.9  The new index on employees(profile_id) exists
-- ----------------------------------------------------------------------------

SELECT
  'A.9  idx_employees_profile_id exists'              AS test,
  EXISTS (
    SELECT 1
    FROM   pg_indexes
    WHERE  schemaname = 'public'
      AND  tablename  = 'employees'
      AND  indexname  = 'idx_employees_profile_id'
  )                                                   AS passed;

-- Expected: passed = true


-- ----------------------------------------------------------------------------
-- A.10  Pre-existing indexes from prior migrations are still intact
-- ----------------------------------------------------------------------------

WITH expected_indexes (indexname) AS (
  VALUES
    ('idx_employees_department_id'),
    ('idx_employees_status'),
    ('idx_activity_logs_created_at'),
    ('idx_activity_logs_target_employee_id')
)
SELECT
  'A.10 index intact: ' || e.indexname               AS test,
  (i.indexname IS NOT NULL)                          AS passed
FROM   expected_indexes e
LEFT JOIN pg_indexes i
       ON i.schemaname = 'public'
      AND i.indexname  = e.indexname
ORDER BY e.indexname;

-- Expected: 4 rows, all passed = true.
-- passed = false means that index is missing — a prior migration may not have applied.


-- ----------------------------------------------------------------------------
-- A.11  Existing triggers are present and enabled (regression check)
-- ----------------------------------------------------------------------------

WITH expected_triggers (tgname) AS (
  VALUES
    ('employees_audit_insert'),
    ('employees_audit_update'),
    ('employees_audit_delete'),
    ('set_employees_updated_at'),
    ('set_profiles_updated_at')
)
SELECT
  'A.11 trigger present and enabled: ' || e.tgname  AS test,
  (t.tgname IS NOT NULL AND t.tgenabled <> 'D')     AS passed
  -- passed = true only when the trigger exists AND is not disabled.
  -- passed = false means the trigger is missing or was explicitly disabled.
FROM   expected_triggers e
LEFT JOIN (
  SELECT tg.tgname, tg.tgenabled
  FROM   pg_trigger tg
  JOIN   pg_class     c ON c.oid  = tg.tgrelid
  JOIN   pg_namespace n ON n.oid  = c.relnamespace
  WHERE  n.nspname = 'public'
    AND  NOT tg.tgisinternal
) t ON t.tgname = e.tgname
ORDER BY e.tgname;

-- Expected: 5 rows, all passed = true.
-- passed = false means the trigger is missing or disabled — a prior migration may not have applied.


-- ----------------------------------------------------------------------------
-- A.12  handle_new_user() trigger on auth.users is still active
-- ----------------------------------------------------------------------------

SELECT
  'A.12 on_auth_user_created trigger active'          AS test,
  EXISTS (
    SELECT 1
    FROM   pg_trigger t
    JOIN   pg_class   c ON c.oid = t.tgrelid
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'auth'
      AND  c.relname = 'users'
      AND  t.tgname  = 'on_auth_user_created'
      AND  t.tgenabled <> 'D'
  )                                                   AS passed;

-- Expected: passed = true


-- ----------------------------------------------------------------------------
-- A.13  Policy-definition sanity check: profiles_select recursion guard
--
-- This is a definition-level sanity check, not a runtime recursion proof.
-- It verifies that the profiles_select USING expression:
--   (1) belongs to an existing policy,
--   (2) references private.get_my_role() as the role lookup,
--   (3) references auth.uid() for the identity check,
--   (4) does NOT contain a direct subquery on public.profiles
--       (which would bypass the SECURITY DEFINER guard and risk recursion).
-- The runtime recursion guard itself is enforced by private.get_my_role()
-- being SECURITY DEFINER (verified in A.2b), causing it to read profiles
-- as postgres (BYPASSRLS) rather than as the calling user.
-- ----------------------------------------------------------------------------

-- A.13a  Raw USING expression — inspect manually to confirm expected shape.
SELECT
  'A.13a profiles_select USING expression (manual review)'  AS test,
  qual                                                       AS policy_using_expression
FROM   pg_policies
WHERE  schemaname = 'public'
  AND  tablename  = 'profiles'
  AND  policyname = 'profiles_select';

-- A.13b–e  Boolean checks against the stored policy definition.
SELECT
  'A.13b profiles_select policy exists'                     AS test,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  schemaname = 'public'
      AND  tablename  = 'profiles'
      AND  policyname = 'profiles_select'
  )                                                         AS passed

UNION ALL

SELECT
  'A.13c USING references private.get_my_role()'           AS test,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  schemaname = 'public'
      AND  tablename  = 'profiles'
      AND  policyname = 'profiles_select'
      AND  qual ILIKE '%private.get_my_role%'
  )                                                         AS passed

UNION ALL

SELECT
  'A.13d USING references auth.uid()'                      AS test,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  schemaname = 'public'
      AND  tablename  = 'profiles'
      AND  policyname = 'profiles_select'
      AND  qual ILIKE '%auth.uid%'
  )                                                         AS passed

UNION ALL

SELECT
  'A.13e USING does NOT directly query public.profiles'    AS test,
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  schemaname = 'public'
      AND  tablename  = 'profiles'
      AND  policyname = 'profiles_select'
      AND  qual ILIKE '%from%public.profiles%'
  )                                                         AS passed;

-- Expected: A.13a returns the raw USING text for manual review.
-- Expected: A.13b, A.13c, A.13d, A.13e all show passed = true.


-- ============================================================================
-- SECTION B — BEHAVIORAL TEST GUIDE
-- (Manual steps — requires connecting as specific test users)
-- ============================================================================

/*
The behavioral tests below cannot be automated without actual test user JWTs
or a local Supabase instance.  Perform them manually by:

  a) Signing in as a test user in the application and observing network
     responses in the browser dev tools, or
  b) Using the Supabase Dashboard → Table Editor with a test user's token, or
  c) Running the PostgREST API directly with the appropriate Authorization header.

For each test, the "Expect" line describes what you should observe.

────────────────────────────────────────────────────────────────────────────
B.1  Anonymous cannot read any EMS business table
────────────────────────────────────────────────────────────────────────────
Action: Make a GET request to /rest/v1/employees with the anon API key and
        no Authorization header.
Expect: HTTP 200 with an empty array [] (RLS default-deny + no anon grant).
        OR HTTP 401/403 depending on Supabase config.
        Never: actual employee rows.

────────────────────────────────────────────────────────────────────────────
B.2  Anonymous cannot read profiles, departments, or activity_logs
────────────────────────────────────────────────────────────────────────────
Action: Same as B.1 for each table.
Expect: Empty result or 4xx — never any rows.

────────────────────────────────────────────────────────────────────────────
B.3  Employee role cannot read another employee's row
────────────────────────────────────────────────────────────────────────────
Setup:  Create two employee-role accounts (A and B).
        Link one employee row to A (UPDATE employees SET profile_id = <A's uid>
        WHERE <specific employee id> — run as postgres in SQL Editor).
Action: Sign in as A.  Fetch /rest/v1/employees.
Expect: Only A's linked row is returned.  B's linked row (if any) is absent.
        Rows with profile_id = NULL are absent.

────────────────────────────────────────────────────────────────────────────
B.4  Employee with no linked row sees zero employees
────────────────────────────────────────────────────────────────────────────
Action: Sign in as a user whose profile_id does not appear in any employees row.
        Fetch /rest/v1/employees.
Expect: Empty array [].

────────────────────────────────────────────────────────────────────────────
B.5  HR Staff can read all employees
────────────────────────────────────────────────────────────────────────────
Setup:  Promote a test user to hr_staff via SQL Editor:
        UPDATE public.profiles SET role = 'hr_staff' WHERE id = '<uid>';
Action: Sign in as that user.  Fetch /rest/v1/employees.
Expect: All 120 employee rows.

────────────────────────────────────────────────────────────────────────────
B.6  HR Manager can read all employees
────────────────────────────────────────────────────────────────────────────
Same as B.5 but with role = 'hr_manager'.

────────────────────────────────────────────────────────────────────────────
B.7  Admin can read all employees
────────────────────────────────────────────────────────────────────────────
Same as B.5 but with role = 'admin'.

────────────────────────────────────────────────────────────────────────────
B.8  Employee cannot escalate their own role
────────────────────────────────────────────────────────────────────────────
Action: Sign in as an employee-role user.  Attempt:
        PATCH /rest/v1/profiles?id=eq.<own_uid>
        Body: { "role": "admin" }
        with a valid JWT for that user.
Expect: HTTP 200 with 0 rows affected (no UPDATE policy exists on profiles,
        so the default-deny kicks in silently), OR HTTP 403.
        Never: a successful role change.

Verify by re-fetching the profile: role must still be 'employee'.

────────────────────────────────────────────────────────────────────────────
B.9  No client can directly INSERT into activity_logs
────────────────────────────────────────────────────────────────────────────
Action: Sign in as an admin (highest privilege).  Attempt:
        POST /rest/v1/activity_logs
        Body: { "type": "system", "message": "injected entry" }
Expect: HTTP 403 or 0 rows inserted (no INSERT policy on activity_logs;
        RLS default-deny blocks it even for admin via the REST API).

────────────────────────────────────────────────────────────────────────────
B.10  No client can UPDATE or DELETE activity_logs
────────────────────────────────────────────────────────────────────────────
Action: Attempt PATCH or DELETE on /rest/v1/activity_logs as any role.
Expect: HTTP 403 or 0 rows affected.

────────────────────────────────────────────────────────────────────────────
B.11  HR Staff cannot insert/update/delete departments
────────────────────────────────────────────────────────────────────────────
Action: Sign in as hr_staff.  Attempt:
        POST /rest/v1/departments  Body: { "name": "Test" }
        PATCH /rest/v1/departments?id=eq.<id>  Body: { "name": "Changed" }
        DELETE /rest/v1/departments?id=eq.<id>
Expect: HTTP 403 or 0 rows affected for all three.

────────────────────────────────────────────────────────────────────────────
B.12  Admin and HR Manager can insert/update departments
────────────────────────────────────────────────────────────────────────────
Action: Sign in as admin.  POST /rest/v1/departments Body: { "name": "Test Dept" }
Expect: HTTP 201 and the new row appears.
Cleanup: DELETE the test row afterwards (also as admin).

────────────────────────────────────────────────────────────────────────────
B.13  Employee can only see their own activity_log entries
────────────────────────────────────────────────────────────────────────────
Setup:  Link an employee row to a test user (profile_id = test user's uid).
        Trigger an audit entry by updating that employee via SQL Editor (postgres).
Action: Sign in as that employee-role user.  Fetch /rest/v1/activity_logs.
Expect: Only log entries where target_employee_id = their linked employee row,
        or actor_id = their uid.  Other employees' log entries are absent.

────────────────────────────────────────────────────────────────────────────
B.14  New user signup still creates a profile row automatically
────────────────────────────────────────────────────────────────────────────
Action: Sign up a new account via the app sign-up flow.
        After sign-up, run in SQL Editor:
        SELECT id, role FROM public.profiles ORDER BY created_at DESC LIMIT 1;
Expect: The new user's profile row exists with role = 'employee'.
        Role was NOT taken from any client-supplied input.

────────────────────────────────────────────────────────────────────────────
B.15  Audit trigger still fires on employee UPDATE (regression check)
────────────────────────────────────────────────────────────────────────────
Action: As postgres in SQL Editor:
        UPDATE public.employees
           SET location = 'Remote'
         WHERE id = (SELECT id FROM public.employees LIMIT 1);
        SELECT * FROM public.activity_logs ORDER BY created_at DESC LIMIT 1;
Expect: A new activity_log row with type = 'employee-update' and a message
        describing the location change.  actor_id will be NULL (no JWT in
        SQL Editor context).

────────────────────────────────────────────────────────────────────────────
B.16  Employee role cannot read another user's profile
────────────────────────────────────────────────────────────────────────────
Action: Sign in as employee-role user A.  Fetch /rest/v1/profiles.
Expect: Only A's own profile row.  No other profiles returned.
*/
