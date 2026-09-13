import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getCapabilities, type Capabilities } from '../lib/authorization'

/** The single hook every component uses to read what the current user can do. */
export function useCapabilities(): Capabilities {
  const { role } = useAuth()
  return useMemo(() => getCapabilities(role), [role])
}
