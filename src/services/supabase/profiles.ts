// Stage 3.1: typed data-access module for the `profiles` table.
//
// Used by AuthContext to load the current user's profile (including role)
// after sign-in. Nothing here is imported by presentational components
// directly. RLS is not enabled yet at this stage, so this currently
// returns whatever the database allows -- RLS/RBAC enforcement is a later,
// separately-approved stage.

import { supabase } from '../../lib/supabase'
import type { ProfileRow } from '../../types/database'

export interface ProfileResult {
  data: ProfileRow | null
  error: string | null
}

/** Fetches one profile row by id (typically the current auth user's id). */
export async function fetchProfileById(id: string): Promise<ProfileResult> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
