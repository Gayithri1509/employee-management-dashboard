-- ============================================================================
-- 0020_add_announcement_activity_type.sql
-- Adds the 'announcement' value to the activity_type enum, in its own
-- migration/transaction on purpose: PostgreSQL does not allow a newly added
-- enum value to be used in the same transaction that added it, so the RPCs
-- that write 'announcement' rows (0021) must land in a later, separate
-- migration -- the exact same two-step pattern 0017/0018 used for
-- 'role-change'.
--
-- Additive only: no existing enum value, table, or row is touched.
-- ============================================================================

alter type public.activity_type add value if not exists 'announcement';
