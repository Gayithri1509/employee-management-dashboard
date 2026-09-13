import type { ReactNode } from 'react'
import { useCapabilities } from '../hooks/useCapabilities'
import type { Capabilities } from '../lib/authorization'
import AccessDenied from '../pages/AccessDenied'

interface RequireCapabilityProps {
  capability: keyof Capabilities
  children: ReactNode
}

/**
 * Route-level guard: renders children only if the current user's
 * capabilities include the given one, otherwise renders AccessDenied. This
 * is a UX convenience, same as every other frontend check in this app --
 * the real boundary is RLS/RPCs (migrations 0012/0013). A user who bypasses
 * this (e.g. by editing client state) still cannot perform a disallowed
 * mutation or read disallowed rows, because the database enforces the same
 * rule independently.
 */
function RequireCapability({ capability, children }: RequireCapabilityProps) {
  const capabilities = useCapabilities()

  if (!capabilities[capability]) {
    return <AccessDenied />
  }

  return <>{children}</>
}

export default RequireCapability
