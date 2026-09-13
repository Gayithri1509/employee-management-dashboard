-- ============================================================================
-- 0017_add_role_change_activity_type.sql
-- Adds the 'role-change' value to the activity_type enum, in its own
-- migration/transaction on purpose: PostgreSQL does not allow a newly
-- added enum value to be used in the same transaction that added it, so
-- the RPC that writes 'role-change' rows (0018) must land in a later,
-- separate migration.
--
-- Additive only: no existing enum value, table, or row is touched. A role
-- change was previously indistinguishable from an employee update in
-- Smart Activity -- it wasn't logged at all, since set_user_role() never
-- wrote to activity_logs. This is purely schema groundwork for 0018.
-- ============================================================================

alter type public.activity_type add value if not exists 'role-change';
