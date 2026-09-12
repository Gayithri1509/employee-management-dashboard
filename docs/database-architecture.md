# EMS Database Architecture — Stage 1: Database Foundation

Status: Stage 1 complete (schema, triggers, seed data). Not yet connected to the
frontend — the running app still uses localStorage untouched. Authentication,
RLS policies, React Router, and the Supabase-client data-access layer are
later stages and are intentionally not part of this document's scope.

## Why PostgreSQL / Supabase

The application's actual complexity — CRUD on a handful of related tables,
role-based access, an audit trail — doesn't justify a bespoke backend
service. Supabase provides a managed Postgres database, a secure
auto-generated REST API (PostgREST) enforced by Row Level Security, and
Auth, which together cover everything this app needs without a team having
to build and operate a separate API server. Postgres itself was chosen (over
a NoSQL store) because the data is inherently relational — employees belong
to departments, activity log entries reference employees and actors — and
because Postgres's Row Level Security is what will let authorization live in
the database itself rather than being re-implemented and re-checked in every
frontend code path.

## Schema

### `departments`
| column | type | notes |
|---|---|---|
| id | uuid, pk | `gen_random_uuid()` |
| name | text, unique, not null | the 8 existing department names |
| created_at | timestamptz, not null | default `now()` |

Was a hardcoded 8-value TypeScript union (`DEPARTMENTS` in
`src/types/employee.ts`). Normalizing it into a real table means a
department can be renamed or added later without a code change or
migration of the `employees` table.

### `profiles`
| column | type | notes |
|---|---|---|
| id | uuid, pk | references `auth.users(id)`, `on delete cascade` |
| full_name | text | nullable |
| role | `user_role` enum, not null | default `'employee'` |
| created_at / updated_at | timestamptz, not null | `updated_at` auto-maintained |

One row per Supabase Auth user. `role` is what RBAC will read (Stage 8).
Stage 1 only creates the table; the trigger that auto-inserts a row here on
sign-up is Stage 3 (Authentication) work, out of scope here since Stage 1
was explicitly database-schema-only.

### `employees`
| column | type | notes |
|---|---|---|
| id | uuid, pk | `gen_random_uuid()` — was a client-generated string like `EMP001` |
| name | text, not null | |
| role | text, not null | job title — distinct from `profiles.role` (RBAC) |
| department_id | uuid, not null, fk → `departments(id)` | was a free-text union |
| email | text, not null, unique | |
| phone | text | nullable |
| location | text | nullable |
| status | `employee_status` enum, not null | default `'Active'` — was a free-text union |
| joining_date | date, not null | was an ISO date **string** |
| profile_id | uuid, fk → `profiles(id)` | nullable; links an Employee-role user to their own record for self-service views (Stage 8+) |
| created_by / updated_by | uuid, fk → `profiles(id)` | nullable — **null means no authenticated actor**, e.g. seed data |
| created_at / updated_at | timestamptz, not null | `updated_at` auto-maintained |

Indexes: `department_id`, `status`. `email`'s `unique` constraint already
provides its own index, so no separate one was added. A trigram
(`pg_trgm`) index for fuzzy search across name/email/role was **not**
added in Stage 1 — with 120 rows, a plain `ILIKE` scan is effectively free;
add `pg_trgm` only once real search latency at real data volume justifies
it (see "Performance" in the architecture proposal doc).

### `activity_logs`
| column | type | notes |
|---|---|---|
| id | uuid, pk | |
| type | `activity_type` enum, not null | `system` \| `employee-update` \| `auth` |
| actor_id | uuid, fk → `profiles(id)` | nullable — null for system events or no authenticated actor |
| target_employee_id | uuid, fk → `employees(id)`, **on delete set null** | see below |
| message | text, not null | human-readable sentence, same wording style as the original localStorage-era Smart Activity Log |
| metadata | jsonb | structured detail — always carries `employee_id`/`employee_name` so an entry stays identifiable even after the FK is nulled out by a later employee deletion |
| created_at | timestamptz, not null | indexed |

Indexes: `created_at desc` (the log is always read newest-first),
`target_employee_id` (per-employee activity lookups, e.g. the future
`/employees/:id` page).

`target_employee_id` uses `on delete set null` rather than a plain
reference: an `AFTER DELETE` trigger inserting a new audit row that points
at an id which no longer exists would otherwise be impossible (a foreign
key violation), and a plain `references` with no `on delete` action would
block deleting an employee at all once they have any history. Instead,
deleting an employee detaches old entries from the FK but the entries
survive, and `metadata.employee_id` / `metadata.employee_name` keep them
identifiable regardless.

## Enums
- `user_role`: `admin`, `hr_manager`, `hr_staff`, `employee` — see "RBAC preparation" below.
- `employee_status`: `Active`, `Inactive`, `On Leave` — unchanged from the current frontend union.
- `activity_type`: `system`, `employee-update`, `auth` — `auth` is reserved for Stage 3 (sign-in/out/role-change events); nothing writes it yet.

## Relationships
`employees.department_id → departments.id` (many employees per department).
`employees.profile_id → profiles.id` (optional, one-to-one, self-service link).
`employees.created_by` / `employees.updated_by → profiles.id` (nullable audit-actor references).
`profiles.id → auth.users.id` (one-to-one, Supabase-managed).
`activity_logs.actor_id → profiles.id` (nullable — who performed the action).
`activity_logs.target_employee_id → employees.id`, `on delete set null` (which employee it's about, if any).

## Triggers

**`set_updated_at()`** — a single reusable `BEFORE UPDATE` function, attached
separately to `profiles` and `employees`, that sets `updated_at = now()`.
Written once, attached per table, rather than duplicated logic.

**`employees_audit_trigger()`** — `AFTER INSERT/UPDATE/DELETE` on
`employees`, the server-side replacement for the old app-level
`buildEmployeeUpdateMessage` logic in `Dashboard.tsx`. It writes exactly one
`activity_logs` row per meaningful event:
- **INSERT** → `"<name> was added to the system."`
- **DELETE** → `"<name> was removed from the system."` (target_employee_id
  left null immediately, since the row is already gone; id/name kept in
  metadata)
- **UPDATE** → compares `OLD` vs `NEW` across the business fields only
  (name, role, department, status, email, phone, location, joining_date —
  never id/timestamps/actor columns). No changed field → **no row is
  written at all** (the no-op-save guard, matching the original app's
  behavior exactly). Exactly one changed field that is name, role,
  department, or status gets the same field-specific wording the original
  app used (e.g. `"X's status changed from Active to On Leave."`); any
  other single field gets generic wording (`"X's Email was updated."`);
  more than one changed field produces **one combined entry**
  (`"X's profile was updated: Role, Location changed."`), never one row
  per field.

Because this logic lives in a trigger, it fires no matter what inserts,
updates, or deletes the row — a future admin script, a bulk import, or a
frontend bug can't produce an untracked change or a forged/skipped audit
entry. This is a deliberate strengthening over the old app-level approach,
where the log entry was only as trustworthy as the one code path that
happened to write it.

## Seed strategy

`0008_seed_departments.sql` seeds the 8 existing departments unchanged.
`0009_seed_system_activity_log.sql` inserts the single `"Activity log
initialized."` system entry, mirroring the original localStorage-era app's
first-run behavior, for continuity.

`0010_seed_employees.sql` seeds exactly 120 employees: the original 12 from
`src/data/employees.ts`, **preserved exactly** (same name, role, department,
email, phone, location, status, joining date — only the id changes, from a
client-generated string like `EMP001` to a real uuid, since the old string
ids were never meant to be stable identifiers), plus 108 additional
synthetic records.

The 108 additional employees were generated by `supabase/generate_seed.py`
(kept alongside the migrations, not run automatically — its *output* is
what's committed as the static `0010_seed_employees.sql`, so the seed is
reproducible by construction: it's the same file every time, not
regenerated on each deploy — verified by running the script independently
on two different machines with two different Python versions, 3.11 and
3.10, and confirming a byte-identical SHA-256 hash both times). The script:
- uses `random.seed(42)` — a fixed seed, so re-running it produces byte-identical output;
- builds the full cross product of two independent first-/last-name pools (60 names each, spanning many naming traditions, matching the international flavor of the original 12) — 3,600 possible pairs — shuffles that list deterministically, then draws 108 unique names from it, checked against the original 12 to avoid collisions (an earlier divmod-based scheme technically produced unique pairs too, but strung 60 consecutive employees under the same last name before it changed; shuffling the full cross product first avoids that and reads as genuinely distinct people);
- assigns each department enough additional employees to bring every department to exactly 15 (3+12, 2+13, 1+14, 1+14, 2+13, 1+14, 1+14, 1+14 = 120 total), from a curated per-department job-title list;
- assigns a status mix of 87 Active / 10 Inactive / 11 On Leave among the 108 (bringing the full 120 to 96 Active / 12 Inactive / 12 On Leave — a realistic ~80/10/10 split), shuffled with the same fixed seed;
- generates unique emails (`first.last@examplecorp.com`, matching the original 12's convention), continuing the original phone-number sequence (`+1 555-0113` onward), and spreading joining dates deterministically between 2015 and mid-2026.

No web scraping, no real people's data, and no fake `auth.users` or
`profiles` rows were created — verified directly (`select count(*) from
auth.users` / `profiles` both return 0 after this migration set, confirmed
against a local Postgres instance with a stub `auth` schema standing in for
Supabase's own).

These 120 rows are synthetic bootstrap data, not real HR actions, so
`0010_seed_employees.sql` disables the `employees_audit_insert` trigger for
the duration of its own bulk insert and re-enables it immediately
afterward, inside the same transaction (`begin; ... commit;`) so the
disable can never accidentally outlive the migration. The `UPDATE` and
`DELETE` audit triggers are never touched — they stay enabled throughout,
including during this migration. The result: after all ten migrations run,
`activity_logs` holds exactly one row, `"Activity log initialized."`
(from `0009`), not 121. This was a deliberate, later refinement to Stage 1
— the schema, the `employees_audit_trigger()` function, and the trigger
definitions themselves were not changed at all; only the seed migration's
own bulk insert is temporarily exempted. Every future employee
insert/update/delete made through the running application (Stage 5+) is
audited exactly as documented above, with no change to the trigger's logic.
Verified directly: after seeding, all three triggers report as enabled
(`pg_trigger.tgenabled = 'O'`), and a subsequent real `INSERT`/`UPDATE`/
`DELETE` on `employees` each produce their normal audit entry.

## RBAC preparation (not enforced yet)

`profiles.role` (`admin` | `hr_manager` | `hr_staff` | `employee`) and
`employees.profile_id` exist specifically so Stage 8 can write Row Level
Security policies without another schema change. Planned access, to be
enforced by RLS in Stage 8, not Stage 1:
- **Admin** — full access, including managing other users' roles and department CRUD.
- **HR Manager** — full employee/department management, full activity/analytics visibility, cannot change roles.
- **HR Staff** — create/edit employees, cannot delete departments or manage roles.
- **Employee** — read-only access to their own linked employee record (via `profile_id`) and activity entries about them.

**RLS is intentionally not enabled or written yet.** Enabling RLS without
finished policies would either lock every table down completely (all access
denied — the safe-but-broken default) or require writing policies now that
Stage 3 (Authentication) hasn't happened yet to actually test against. That
work is explicitly Stage 8.

## Future data-entry flow (not implemented yet)

Once Stage 5 connects the frontend, individual employees will be created
through: **HR/Admin → Add Employee UI → Supabase client (PostgREST, RLS-
enforced) → PostgreSQL**, with the same audit trigger firing automatically.

A future bulk-import workflow (not scheduled to a specific stage yet) would
follow: **CSV/Excel upload → client-side validation → a preview/confirm
step → duplicate-detection against existing emails → import → PostgreSQL**
— using the same `employees` table and the same audit trigger, so a bulk
import produces the same trustworthy per-row history as a manual edit.
Neither the Add Employee UI nor the bulk-import UI exists yet; this section
documents the intended flow only.

## Migration strategy

Migrations are plain, ordered, numbered SQL files under
`supabase/migrations/`, applied via the Supabase CLI (`supabase db push`) —
never hand-edited through the Supabase dashboard in production. Each schema
migration uses `if not exists` / `do $$ ... $$` guards and each seed
migration uses `on conflict ... do nothing`, so re-applying the full set to
an already-migrated database is safe rather than erroring. New schema
changes going forward get their own new numbered file, never edits to an
already-applied one. Verified locally against a throwaway Postgres instance
(with a stub `auth` schema standing in for Supabase's own, since it doesn't
exist outside a real Supabase project) before being committed: two
independent seed runs on separate fresh databases produced byte-identical
employee data (verified by hashing), confirming the seed is genuinely
reproducible and not order- or timing-dependent.
