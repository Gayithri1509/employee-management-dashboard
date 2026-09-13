// Admin User & Access data-access module. Every function here is admin-only,
// enforced server-side by the SECURITY DEFINER RPCs in
// supabase/migrations/0016_admin_user_management_rpcs.sql -- profiles has no
// client-facing UPDATE policy and auth.users is never exposed via the API,
// so these RPCs are the only paths that can ever list users with email or
// change a role.

import { supabase } from '../../lib/supabase'
import type { UserRole } from '../../types/database'
import { humanizeError } from '../../utils/errors'

export interface AdminUser {
  id: string
  fullName: string | null
  email: string
  role: UserRole
  createdAt: string
  lastSignInAt: string | null
}

export interface AdminUsersResult {
  data: AdminUser[] | null
  error: string | null
}

export interface SetUserRoleResult {
  error: string | null
}

/** Lists every application user (profiles + email/last_sign_in_at from auth.users). Admin only. */
export async function fetchUsersForAdmin(): Promise<AdminUsersResult> {
  const { data, error } = await supabase.rpc('list_profiles_for_admin')

  if (error) {
    return { data: null, error: humanizeError(error.message, 'Could not load users. Please try again.') }
  }

  const users: AdminUser[] = (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
  }))

  return { data: users, error: null }
}

/**
 * Changes another user's role via set_user_role. Admin only; rejected
 * server-side if the caller targets their own row or would leave zero
 * admins. There is no way to force this through the UI -- the RPC is the
 * authoritative check regardless of what the client sends.
 */
export async function setUserRole(userId: string, role: UserRole): Promise<SetUserRoleResult> {
  const { error } = await supabase.rpc('set_user_role', { p_user_id: userId, p_role: role })

  if (error) {
    return { error: humanizeError(error.message, "Could not change this user's role. Please try again.") }
  }

  return { error: null }
}
