import type { UserRole } from '../types/database'
import { formatRoleLabel } from '../utils/formatting'

interface RoleBadgeProps {
  role: UserRole
}

const ROLE_STYLES: Record<UserRole, { badge: string; dot: string }> = {
  admin: { badge: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  hr_manager: { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  hr_staff: { badge: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  employee: { badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
}

function RoleBadge({ role }: RoleBadgeProps) {
  const styles = ROLE_STYLES[role]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${styles.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {formatRoleLabel(role)}
    </span>
  )
}

export default RoleBadge
