import type { EmployeeStatus } from '../types/employee'

interface StatusBadgeProps {
  status: EmployeeStatus
}

const STATUS_STYLES: Record<EmployeeStatus, { badge: string; dot: string }> = {
  Active: { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Inactive: { badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  'On Leave': { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${styles.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {status}
    </span>
  )
}

export default StatusBadge
