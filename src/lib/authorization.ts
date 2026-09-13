// Single reusable authorization/capability layer. Every UI decision about
// what a user can see or do reads from here -- nowhere else in the app
// should compare `role === 'admin'` (or similar) directly. This mirrors,
// but does not replace, the real security boundary: the database's RLS
// policies (migration 0012) and SECURITY DEFINER RPCs (migration 0013)
// enforce the same role model independently and authoritatively. If this
// file and the database ever disagree, the database wins -- this layer
// only controls what the UI offers, never what the backend allows.

import type { UserRole } from '../types/database'

export interface Capabilities {
  canViewEmployees: boolean
  canCreateEmployee: boolean
  canEditEmployee: boolean
  canChangeEmployeeDepartment: boolean
  canDeactivateEmployee: boolean
  canDeleteEmployee: boolean
  canManageDepartments: boolean
  canManageRoles: boolean
  /** Link/unlink an employee record to an authenticated profile for self-service access -- admin + hr_manager, per supabase/migrations/0019_employee_profile_linking.sql. */
  canManageEmployeeLinking: boolean
  canViewActivity: boolean
  canViewInsights: boolean
  /** Create/edit/publish/archive/delete Company Communications. Admin only -- see supabase/migrations/0021_announcements.sql; the capability model has no precedent for extending hr_manager into content/communications management. */
  canManageAnnouncements: boolean
  canViewOwnProfile: boolean
  canEditOwnProfile: boolean
  /** Every real account gets Settings (it's about their own account, not org data) -- false only for the no-session/no-profile default. */
  canViewSettings: boolean
}

const NONE: Capabilities = {
  canViewEmployees: false,
  canCreateEmployee: false,
  canEditEmployee: false,
  canChangeEmployeeDepartment: false,
  canDeactivateEmployee: false,
  canDeleteEmployee: false,
  canManageDepartments: false,
  canManageRoles: false,
  canManageEmployeeLinking: false,
  canViewActivity: false,
  canViewInsights: false,
  canManageAnnouncements: false,
  canViewOwnProfile: false,
  canEditOwnProfile: false,
  canViewSettings: false,
}

const ADMIN: Capabilities = {
  ...NONE,
  canViewEmployees: true,
  canCreateEmployee: true,
  canEditEmployee: true,
  canChangeEmployeeDepartment: true,
  canDeactivateEmployee: true,
  canDeleteEmployee: true,
  canManageDepartments: true,
  canManageRoles: true,
  canManageEmployeeLinking: true,
  canViewActivity: true,
  canViewInsights: true,
  canManageAnnouncements: true,
  canViewSettings: true,
}

const HR_MANAGER: Capabilities = {
  ...ADMIN,
  canDeleteEmployee: false,
  canManageRoles: false,
  // Communications/content management is deliberately not extended to
  // hr_manager -- see the canManageAnnouncements doc comment above.
  canManageAnnouncements: false,
}

const HR_STAFF: Capabilities = {
  ...NONE,
  canViewEmployees: true,
  canCreateEmployee: true,
  canEditEmployee: true,
  // canChangeEmployeeDepartment stays false: hr_staff may create an
  // employee (choosing their initial department) but may not reassign an
  // existing employee's department -- update_employee (0013) rejects that
  // server-side regardless of what the UI allows.
  canViewActivity: true,
  canViewInsights: true,
  canViewSettings: true,
}

const EMPLOYEE: Capabilities = {
  ...NONE,
  canViewOwnProfile: true,
  canEditOwnProfile: true,
  canViewSettings: true,
}

/**
 * Maps a profile role to what the UI should offer. A null role (no session,
 * or a profile row that hasn't loaded/doesn't exist yet) gets NONE -- the
 * same "no access" default the database's private.get_my_role() uses for a
 * null role in RLS policies.
 */
export function getCapabilities(role: UserRole | null): Capabilities {
  switch (role) {
    case 'admin':
      return ADMIN
    case 'hr_manager':
      return HR_MANAGER
    case 'hr_staff':
      return HR_STAFF
    case 'employee':
      return EMPLOYEE
    default:
      return NONE
  }
}
