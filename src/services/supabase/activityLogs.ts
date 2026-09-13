// Stage 2 (raw rows) + Phase 1 (mapped to the app's ActivityEntry shape) --
// typed data-access module for the `activity_logs` table.

import { supabase } from '../../lib/supabase'
import type { ActivityLogRow } from '../../types/database'
import type { ActivityEntry } from '../../types/activity'

export interface ActivityLogsResult {
  data: ActivityLogRow[] | null
  error: string | null
}

export interface ActivityEntriesResult {
  data: ActivityEntry[] | null
  error: string | null
}

/**
 * Fetches the most recent activity log entries, newest first.
 * Surfaces errors, never throws.
 */
export async function fetchActivityLogs(limit = 50): Promise<ActivityLogsResult> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Maps one database activity_logs row to the app's ActivityEntry shape.
 *
 * Returns null for the 'auth' activity type, which the UI's ActivityType
 * union does not model yet (see src/types/activity.ts) -- nothing writes
 * 'auth' rows today (see docs/database-architecture.md), but the mapper
 * still handles it defensively, the same "skip and report" pattern used by
 * mapEmployeeRowToEmployee for unrecognized values.
 */
export function mapActivityLogRowToEntry(row: ActivityLogRow): ActivityEntry | null {
  if (row.type !== 'system' && row.type !== 'employee-update') {
    return null
  }

  return {
    id: row.id,
    type: row.type,
    message: row.message,
    timestamp: row.created_at,
    employeeId: row.target_employee_id ?? undefined,
  }
}

/**
 * Fetches the most recent activity log entries and maps them to the app's
 * ActivityEntry shape. Any row with an unrecognized type is skipped and
 * reported in `error` rather than silently dropped; successfully mapped
 * entries are still returned in `data` alongside it.
 */
export async function fetchActivityEntries(limit = 50): Promise<ActivityEntriesResult> {
  const rowsResult = await fetchActivityLogs(limit)

  if (rowsResult.error || !rowsResult.data) {
    return { data: null, error: rowsResult.error ?? 'Failed to load activity log.' }
  }

  const entries: ActivityEntry[] = []
  let unmapped = 0

  for (const row of rowsResult.data) {
    const mapped = mapActivityLogRowToEntry(row)
    if (mapped) {
      entries.push(mapped)
    } else {
      unmapped += 1
    }
  }

  if (unmapped > 0) {
    return {
      data: entries,
      error: `${unmapped} activity log entr${unmapped === 1 ? 'y has' : 'ies have'} an unsupported type and could not be displayed.`,
    }
  }

  return { data: entries, error: null }
}
