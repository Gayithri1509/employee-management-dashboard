// Stage 3.1: Supabase Auth service -- email/password sign-up, sign-in,
// sign-out, current-session lookup, and an auth-state-change subscription
// helper.
//
// Mirrors the {data, error} pattern used by the other Stage 2 service
// modules (src/services/supabase/{departments,employees,activityLogs}.ts):
// every function surfaces errors instead of throwing, and nothing here ever
// logs a token, password, or session object.
//
// This module does not touch `profiles` or role checks. Profile
// auto-creation happens server-side (see
// supabase/migrations/0011_profiles_signup_trigger.sql), and RBAC/RLS-aware
// behavior is out of scope for Stage 3.1.

import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export interface AuthResult {
  user: User | null
  session: Session | null
  error: string | null
}

export interface SessionResult {
  session: Session | null
  error: string | null
}

/** Signs up a new user with email + password. Never sets or accepts a role. */
export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { user: null, session: null, error: error.message }
  }

  return { user: data.user, session: data.session, error: null }
}

/** Signs in an existing user with email + password. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { user: null, session: null, error: error.message }
  }

  return { user: data.user, session: data.session, error: null }
}

/** Signs the current user out. */
export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

/** Reads the current session, if any, without throwing. */
export async function getCurrentSession(): Promise<SessionResult> {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    return { session: null, error: error.message }
  }

  return { session: data.session, error: null }
}

/**
 * Subscribes to auth state changes (sign-in, sign-out, token refresh).
 * Returns an unsubscribe function; callers are responsible for calling it
 * on cleanup (e.g. a useEffect's return).
 */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return () => subscription.unsubscribe()
}
