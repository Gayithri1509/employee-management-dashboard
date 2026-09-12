import type { Employee } from '../types/employee'
import StatusBadge from './StatusBadge'

interface EmployeeCardProps {
  employee: Employee
  onEdit: (employee: Employee) => void
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function formatJoiningDate(isoDate: string): string {
  const [year, month] = isoDate.split('-')
  const monthIndex = Number(month) - 1
  return `${MONTH_NAMES[monthIndex]} ${year}`
}

function EmployeeCard({ employee, onEdit }: EmployeeCardProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <span className="text-xs font-medium text-slate-400">{employee.id}</span>
        <StatusBadge status={employee.status} />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{employee.name}</h3>
      <p className="text-xs text-slate-500">{employee.role}</p>
      <span className="mt-2 inline-block w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
        {employee.department}
      </span>
      <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <p>{employee.email}</p>
        <p>{employee.phone}</p>
        <p className="mt-1 text-slate-400">{employee.location}</p>
        <p className="text-slate-400">Joined {formatJoiningDate(employee.joiningDate)}</p>
      </div>
      <div className="mt-auto border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => onEdit(employee)}
          aria-label={`Edit ${employee.name}`}
          className="w-full rounded-md border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

export default EmployeeCard
