// Supabase Auth service -- email/password sign-up, sign-in, sign-out,
// current-session lookup, and an auth-state-change subscription helper.
//
// Mirrors the {data, error} pattern used by the other service modules:
// every function surfaces errors instead of throwing, and nothing here ever
// logs a token, password, or session object.
//
// This module does not touch `profiles` or role checks beyond the optional
// display name below. Profile auto-creation happens server-side (see
// supabase/migrations/0011_profiles_signup_trigger.sql) and always hard-
// codes role to 'employee' -- nothing here can influence a role.

import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { humanizeError } from '../../utils/errors'

export interface AuthResult {
  user: User | null
  session: Session | null
  error: string | null
}

export interface SessionResult {
  session: Session | null
  error: string | null
}

/**
 * Signs up a new user with email + password and an optional display name.
 * The name (if given) is passed as auth user metadata; handle_new_user()
 * (0011) copies it into profiles.full_name at row-creation time -- it is
 * never used to set or influence role, which that trigger always hard-codes
 * to 'employee'.
 */
export async function signUp(email: string, password: string, fullName?: string): Promise<AuthResult> {
  const trimmedName = fullName?.trim()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: trimmedName ? { data: { full_name: trimmedName } } : undefined,
  })

  if (error) {
    return { user: null, session: null, error: humanizeError(error.message, 'Could not create your account. Please try again.') }
  }

  return { user: data.user, session: data.session, error: null }
}

/** Signs in an existing user with email + password. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { user: null, session: null, error: humanizeError(error.message, 'Could not sign in. Please try again.') }
  }

  return { user: data.user, session: data.session, error: null }
}

/** Signs the current user out. */
export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: humanizeError(error.message, 'Could not sign out. Please try again.') }
  }

  return { error: null }
}

/** Reads the current session, if any, without throwing. */
export async function getCurrentSession(): Promise<SessionResult> {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    return { session: null, error: humanizeError(error.message, 'Could not restore your session.') }
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
