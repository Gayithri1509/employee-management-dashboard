-- ============================================================================
-- 0006_activity_logs.sql
-- Append-only audit trail. Rows are written server-side by triggers on the
-- employees table (see 0007_employee_audit_triggers.sql) — the frontend
-- never inserts into this table directly, which is what makes it trustworthy
-- as an audit log rather than just an app-managed feed.
-- ============================================================================

create table if not exists activity_logs (
  id                 uuid primary key default gen_random_uuid(),
  type               activity_type not null,
  actor_id           uuid references profiles (id),   -- null = system event or no authenticated actor (e.g. seed data)
  target_employee_id uuid references employees (id) on delete set null, -- historical entries survive an employee's later deletion; see 0007's metadata for a permanent id/name record
  message            text not null,
  metadata           jsonb,
  created_at         timestamptz not null default now()
);

comment on table activity_logs is
  'Append-only audit trail. Populated by server-side triggers, never written directly by client code.';
comment on column activity_logs.actor_id is 'Null for system events or actions with no authenticated actor (e.g. seed data).';

create index if not exists idx_activity_logs_created_at         on activity_logs (created_at desc);
create index if not exists idx_activity_logs_target_employee_id on activity_logs (target_employee_id);
