// Stage 2: typed data-access module for the `activity_logs` table.
//
// Nothing in this file is imported by presentational components yet -- see
// docs/supabase-client-setup.md. This intentionally returns raw ActivityLogRow
// data (database shape) rather than mapping to the app's existing
// src/types/activity.ts ActivityEntry shape -- that mapping is out of scope
// for Stage 2, since the dashboard is not yet connected to Supabase.

import { supabase } from '../../lib/supabase'
import type { ActivityLogRow } from '../../types/database'

export interface ActivityLogsResult {
  data: ActivityLogRow[] | null
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
