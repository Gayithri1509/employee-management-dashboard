import type { Capabilities } from '../lib/authorization'

// Route-based navigation (replaces the old single-page anchor-scroll nav).
// Which items appear is entirely a function of the viewer's capabilities --
// see getNavItems below -- so a role change is reflected here automatically
// with no separate per-role list to keep in sync.
export type RouteId =
  | 'overview'
  | 'employees'
  | 'departments'
  | 'activity'
  | 'insights'
  | 'my-profile'
  | 'settings'
  | 'users'

export interface NavItem {
  id: RouteId
  label: string
  path: string
}

/**
 * Builds the nav items a user with the given capabilities should see.
 * An org-wide viewer (anyone who can see the employee directory) gets the
 * standard org nav, filtered further by department/activity/insights
 * capability; someone who can only view their own profile (the employee
 * role) gets a single "My Profile" item instead -- never both, and never a
 * nav item for a route their capabilities don't allow. Settings is
 * appended for anyone with any access at all -- it's about the viewer's
 * own account, not organization data, so every real role gets it.
 */
export function getNavItems(capabilities: Capabilities): NavItem[] {
  if (!capabilities.canViewEmployees) {
    const items: NavItem[] = capabilities.canViewOwnProfile
      ? [{ id: 'my-profile', label: 'My Profile', path: '/my-profile' }]
      : []

    if (capabilities.canViewSettings) {
      items.push({ id: 'settings', label: 'Settings', path: '/settings' })
    }

    return items
  }

  const items: NavItem[] = [{ id: 'overview', label: 'Overview', path: '/dashboard' }]
  items.push({ id: 'employees', label: 'Employees', path: '/employees' })

  if (capabilities.canManageDepartments) {
    items.push({ id: 'departments', label: 'Departments', path: '/departments' })
  }
  if (capabilities.canViewActivity) {
    items.push({ id: 'activity', label: 'Activity', path: '/activity' })
  }
  if (capabilities.canViewInsights) {
    items.push({ id: 'insights', label: 'Insights', path: '/insights' })
  }
  if (capabilities.canManageRoles) {
    items.push({ id: 'users', label: 'User & Access', path: '/users' })
  }
  if (capabilities.canViewSettings) {
    items.push({ id: 'settings', label: 'Settings', path: '/settings' })
  }

  return items
}

/** Where "/" should redirect to for a given set of capabilities. */
export function getHomePath(capabilities: Capabilities): string {
  if (capabilities.canViewEmployees) return '/dashboard'
  if (capabilities.canViewOwnProfile) return '/my-profile'
  if (capabilities.canViewSettings) return '/settings'
  return '/access-denied'
}
