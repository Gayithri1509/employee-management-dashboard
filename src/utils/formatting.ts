// Small, genuinely shared display helpers used by multiple employee-facing
// components (card, spotlight). Kept here rather than duplicated, per the
// project's convention of only extracting a utils module when there is a
// real multi-consumer need.
import type { UserRole } from '../types/database'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  hr_manager: 'HR Manager',
  hr_staff: 'HR Staff',
  employee: 'Employee',
}

/** Human-readable label for a profile role, e.g. 'hr_manager' -> 'HR Manager'. */
export function formatRoleLabel(role: UserRole | null): string {
  return role ? ROLE_LABELS[role] : 'Unknown role'
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function formatJoiningDate(isoDate: string): string {
  const [year, month] = isoDate.split('-')
  const monthIndex = Number(month) - 1
  return `${MONTH_NAMES[monthIndex]} ${year}`
}

/** Formats a full ISO timestamp (e.g. auth.users.last_sign_in_at) for display. */
export function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return isoTimestamp
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** Real, computed tenure from a joining date to now -- e.g. "3 yr 2 mo", "5 mo", "New this month". Never a fabricated/estimated figure. */
export function formatTenure(isoJoiningDate: string): string {
  const joined = new Date(isoJoiningDate)
  if (Number.isNaN(joined.getTime())) return ''

  const now = new Date()
  let months = (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth())
  if (now.getDate() < joined.getDate()) months -= 1
  months = Math.max(months, 0)

  if (months < 1) return 'New this month'

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) return `${remainingMonths} mo`
  if (remainingMonths === 0) return `${years} yr`
  return `${years} yr ${remainingMonths} mo`
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`
  return initials.toUpperCase()
}
