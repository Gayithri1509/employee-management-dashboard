// Stage 2: Supabase client module.
//
// This module creates and exports the single Supabase client the rest of the
// data-access layer (src/services/supabase/*) uses. It is NOT imported by
// any dashboard/UI component yet -- see docs/supabase-client-setup.md for
// what Stage 2 does and does not connect.
//
// Configuration comes from Vite environment variables (see .env.example):
//   VITE_SUPABASE_URL             - the project's API URL
//   VITE_SUPABASE_PUBLISHABLE_KEY - the anon/publishable key
//
// The browser must only ever receive the publishable/anon key. Never add a
// VITE_SUPABASE_SERVICE_ROLE_KEY (or any other service-role value) here or
// anywhere else the frontend can read -- see docs/supabase-client-setup.md.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example) before importing ' +
      'src/lib/supabase.ts.',
  )
}

export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabasePublishableKey)

/**
 * Result of a database health/connectivity check. Never throws -- callers
 * get a typed result back either way.
 */
export interface HealthCheckResult {
  ok: boolean
  error?: string
}

/**
 * Safely checks that the app can reach the database and query it, without
 * pulling back any row data. Intended for a future connectivity indicator;
 * not called anywhere in the UI yet.
 */
export async function checkDatabaseConnection(): Promise<HealthCheckResult> {
  try {
    const { error } = await supabase.from('departments').select('id', { count: 'exact', head: true })

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error connecting to Supabase.',
    }
  }
}
