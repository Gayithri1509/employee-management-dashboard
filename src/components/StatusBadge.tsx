import type { EmployeeStatus } from '../types/employee'

interface StatusBadgeProps {
  status: EmployeeStatus
}

const STATUS_STYLES: Record<EmployeeStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-slate-100 text-slate-500',
  'On Leave': 'bg-amber-100 text-amber-700',
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  )
}

export default StatusBadge
