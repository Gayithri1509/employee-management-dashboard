import { useOutletContext } from 'react-router-dom'
import type { OrgData } from '../hooks/useOrgData'
import type { Capabilities } from '../lib/authorization'

export interface AppOutletContext extends OrgData {
  capabilities: Capabilities
  showToast: (message: string) => void
}

/** Every route page reads shared org data + capabilities + the toast helper through this. */
export function useAppOutletContext(): AppOutletContext {
  return useOutletContext<AppOutletContext>()
}
