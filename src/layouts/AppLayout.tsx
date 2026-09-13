import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCapabilities } from '../hooks/useCapabilities'
import { useOrgData } from '../hooks/useOrgData'
import { getNavItems } from '../types/navigation'
import type { AppOutletContext } from './appOutletContext'
import { formatRoleLabel } from '../utils/formatting'
import Sidebar from '../components/layout/Sidebar'
import TopHeader from '../components/layout/TopHeader'
import Toast from '../components/Toast'

/**
 * The authenticated app shell: sidebar + header + whichever route is active.
 * Owns the single instance of useOrgData so every page shares one fetch of
 * employees/departments/activity instead of each page re-fetching on its
 * own, and owns the toast so any page (or a mutation deep inside one) can
 * surface a message through one consistent UI element.
 */
function AppLayout() {
  const { user, profile, role, signOut } = useAuth()
  const capabilities = useCapabilities()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const orgData = useOrgData(setToastMessage)

  useEffect(() => {
    if (toastMessage === null) return
    const timeoutId = window.setTimeout(() => setToastMessage(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  const displayName = profile?.full_name?.trim() || user?.email || 'User'
  const roleLabel = formatRoleLabel(role)
  const navItems = getNavItems(capabilities)

  const context: AppOutletContext = {
    ...orgData,
    capabilities,
    showToast: setToastMessage,
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        navItems={navItems}
        displayName={displayName}
        roleLabel={roleLabel}
        onSignOut={() => void signOut()}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
        <TopHeader
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          displayName={displayName}
          showOrgControls={capabilities.canViewEmployees}
          activityCount={orgData.activityEntries.length}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet context={context} />
        </main>
      </div>

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default AppLayout
