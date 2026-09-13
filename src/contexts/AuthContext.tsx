// React auth context -- tracks the current Supabase session, user, profile
// (including role), and loading state, and keeps them in sync with Supabase
// Auth's state-change events.
//
// This is UI-layer bookkeeping only, not a security boundary: Row Level
// Security and the SECURITY DEFINER RPCs (migrations 0012-0014) are what
// actually enforce access to data. Nothing here ever logs tokens, passwords,
// or session objects.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { ProfileRow } from '../types/database'
import {
  getCurrentSession,
  onAuthStateChange,
  signIn as signInWithPassword,
  signOut as signOutUser,
  signUp as signUpUser,
} from '../services/supabase/auth'
import { fetchProfileById } from '../services/supabase/profiles'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: ProfileRow | null
  role: ProfileRow['role'] | null
  loading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: string | null }>
  /** Re-fetches the current user's profile row -- call after a change that affects it (e.g. Settings saving a new display name). */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Loads (or clears) the profile row for whichever user id is given. A
  // missing/inaccessible profile is surfaced via authError but never blocks
  // sign-in -- the user is still authenticated even if their profile row is
  // momentarily unavailable (e.g. immediately after sign-up, before the
  // database trigger has run).
  const syncProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }

    const result = await fetchProfileById(userId)

    if (result.error) {
      setAuthError(result.error)
      setProfile(null)
      return
    }

    setProfile(result.data)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function init() {
      const { session: initialSession, error } = await getCurrentSession()

      if (!isMounted) return

      if (error) {
        setAuthError(error)
      }

      setSession(initialSession)
      await syncProfile(initialSession?.user.id)

      if (isMounted) {
        setLoading(false)
      }
    }

    init()

    const unsubscribe = onAuthStateChange((nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      void syncProfile(nextSession?.user.id)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [syncProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      loading,
      authError,
      signIn: async (email, password) => {
        const result = await signInWithPassword(email, password)
        return { error: result.error }
      },
      signUp: async (email, password, fullName) => {
        const result = await signUpUser(email, password, fullName)
        return { error: result.error }
      },
      signOut: async () => signOutUser(),
      refreshProfile: () => syncProfile(session?.user.id),
    }),
    [session, profile, loading, authError, syncProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
