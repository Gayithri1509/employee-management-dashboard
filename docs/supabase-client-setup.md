# Supabase Client Setup (Stage 2)

Stage 2 connects the EMS application's *tooling* to Supabase: an installed
client library, environment-variable configuration, hand-written database
types, and a typed data-access layer. It does **not** connect the dashboard
UI to the database -- the app still reads and writes `localStorage` exactly
as before (`src/services/storage.ts`, `src/services/activityStorage.ts`),
and `src/data/employees.ts` is untouched. Nothing in this stage is imported
by any presentational component.

See `docs/database-architecture.md` for the schema this client talks to,
and `docs/stage-1-supabase-manual-setup.sql` for how that schema was applied
to the live project.

## Environment variables

Two variables are required, read via Vite's `import.meta.env` (see
`src/vite-env.d.ts` for their TypeScript typing). Copy `.env.example` to
`.env` and fill them in from the Supabase Dashboard:

| Variable | Where it comes from | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Project Settings > API > Project URL | e.g. `https://xxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Project Settings > API > Project API keys > `anon` `public` | Safe for the browser -- see below |

Only variables prefixed `VITE_` are ever exposed to browser code by Vite;
this is why both variables use that prefix, and why any variable that must
stay server-only (see below) must never be given one.

`src/lib/supabase.ts` fails fast (throws at import time) if either variable
is missing, so a misconfigured `.env` is caught immediately rather than
producing a client that silently can't connect.

## Why the publishable/anon key is safe here, and what still has to happen before it's safe in general

The `anon`/publishable key is designed to be embedded in client-side code --
it identifies the app to Supabase's API (PostgREST), not a specific user or
an administrator. What actually protects the data behind that key is **Row
Level Security (RLS)**: policies on each table that say which rows a given
request is allowed to read or write, based on who (if anyone) is
authenticated.

**RLS is intentionally not enabled yet** (see `docs/database-architecture.md`,
Stage 1). That means that today, a client holding the anon key could read or
write the `employees`, `departments`, `profiles`, and `activity_logs`
tables without restriction via PostgREST. This is acceptable right now only
because the Supabase client created in this stage is not used by the
dashboard UI or exposed to end users in any way -- it exists purely as
backend-facing tooling, exercised (if at all) from a developer's own
machine. **Before the dashboard is ever connected to this client (a later
stage), RLS policies must be defined and enabled**, and authentication
(also not yet implemented) must be in place so those policies have
something to check.

## What must never be exposed to the browser

Supabase projects also have a `service_role` key, which bypasses RLS
entirely. **This key must never be used in this application.** Concretely:

- No `VITE_SUPABASE_SERVICE_ROLE_KEY` (or any other `VITE_`-prefixed name
  for it) exists anywhere in this codebase, `.env.example`, or
  documentation.
- The Supabase client in `src/lib/supabase.ts` is constructed only from
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- If a later stage needs service-role-level access (for example, a trusted
  server-side job), that must run somewhere the browser cannot reach, with
  its key supplied only through that environment's own secret storage --
  never through a `VITE_`-prefixed variable, which Vite bundles into the
  client JavaScript.

`.env`, `.env.local`, and `.env.*.local` are all excluded from git (see
`.gitignore`); `.env.example` documents the variable names only, with no
real values.

## Data-access layer structure

```
src/lib/supabase.ts            Supabase client instance + checkDatabaseConnection()
src/types/database.ts          Hand-written Database type (departments, profiles,
                                employees, activity_logs) used to type the client
src/services/supabase/
  departments.ts                fetchDepartments(), buildDepartmentNameById()
  employees.ts                  fetchEmployeeRows(), fetchEmployeesWithDepartments(),
                                 mapEmployeeRowToEmployee() (database <-> app adapter)
  activityLogs.ts                fetchActivityLogs()
  index.ts                       barrel re-export of the three modules above
```

Design notes:

- **No Supabase queries in components.** All access to `supabase` goes
  through `src/services/supabase/*`; presentational components would import
  from there, never from `src/lib/supabase.ts` directly, once (in a later
  stage) they are wired up at all.
- **Errors are surfaced, not swallowed.** Every function returns a
  `{ data, error }` result rather than throwing on a query failure, so a
  caller always gets an explicit success/failure signal. `error` is a plain
  string (from the underlying Postgrest error, or a descriptive message)
  rather than a raw exception object.
- **The database <-> app mapping is explicit and isolated.**
  `mapEmployeeRowToEmployee()` in `src/services/supabase/employees.ts` is
  the one place that converts a database `employees` row (`department_id:
  string` UUID) into the app's existing `Employee` shape (`department:
  Department`, a name string from `src/types/employee.ts`). It looks the
  name up via a `department_id -> name` map built by
  `buildDepartmentNameById()`. A row whose `department_id` or `status`
  doesn't resolve to a value the frontend recognizes is skipped and
  reported back in the caller's `error` string rather than silently
  dropped or forced through with bad data.
- **`src/types/database.ts` covers only the four Stage-1 tables**
  (`departments`, `profiles`, `employees`, `activity_logs`), written by hand
  to mirror `supabase/migrations/0001`-`0007` exactly. It is not generated
  by the Supabase CLI (Stage 2 does not use the CLI) and does not attempt to
  model views, functions, or tables that don't exist yet. If the schema
  changes, this file needs a matching manual update.

## Health check

`checkDatabaseConnection()` in `src/lib/supabase.ts` runs a minimal,
row-free query (`select id from departments`, head-only) and returns
`{ ok: true }` or `{ ok: false, error }` without throwing. It is not called
anywhere in the app yet; it exists for a future connectivity indicator or
diagnostic use.

## What Stage 2 deliberately does not do

- Does not connect the dashboard UI to Supabase in any way.
- Does not remove, replace, or change the behavior of `localStorage`
  persistence (`src/services/storage.ts`, `src/services/activityStorage.ts`).
- Does not delete or modify `src/data/employees.ts`.
- Does not implement authentication, RLS, or RBAC.
- Does not add React Router.
- Does not add TanStack Query or any other data-fetching/cache library.
- Does not use the Supabase CLI for anything.

These are left for later, explicitly approved stages.
