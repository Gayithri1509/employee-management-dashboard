// Typed data-access module for the `profiles` table: read (Stage 3.1) plus,
// as of the final batch, the one self-service write path.

import { supabase } from '../../lib/supabase'
import type { ProfileRow } from '../../types/database'
import { humanizeError } from '../../utils/errors'

export interface ProfileResult {
  data: ProfileRow | null
  error: string | null
}

/** Fetches one profile row by id (typically the current auth user's id). */
export async function fetchProfileById(id: string): Promise<ProfileResult> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()

  if (error) {
    return { data: null, error: humanizeError(error.message, 'Could not load your profile. Please try again.') }
  }

  return { data, error: null }
}

/**
 * Updates the caller's own display name via the update_my_profile RPC
 * (migration 0014). There is no id or role parameter -- this can never
 * target another user or change anyone's role.
 */
export async function updateMyFullName(fullName: string): Promise<ProfileResult> {
  const { data, error } = await supabase.rpc('update_my_profile', { p_full_name: fullName })

  if (error) {
    return { data: null, error: humanizeError(error.message, 'Could not save your name. Please try again.') }
  }

  return { data, error: null }
}
