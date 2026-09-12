-- ============================================================================
-- 0009_seed_system_activity_log.sql
-- Mirrors the single "Activity log initialized." system entry the
-- localStorage-era app seeded on first run, for continuity. Inserted
-- directly (not via a trigger) since it isn't tied to any employee row.
-- ============================================================================

insert into activity_logs (type, actor_id, target_employee_id, message, metadata)
select 'system', null, null, 'Activity log initialized.', jsonb_build_object('event', 'system_init')
where not exists (
  select 1 from activity_logs where type = 'system' and message = 'Activity log initialized.'
);
