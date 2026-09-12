import { Briefcase, Building2, Calendar, MapPin } from 'lucide-react'
import type { Employee } from '../types/employee'
import StatusBadge from './StatusBadge'
import { formatJoiningDate, getInitials } from '../utils/formatting'

interface EmployeeSpotlightProps {
  employee: Employee
}

function EmployeeSpotlight({ employee }: EmployeeSpotlightProps) {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-indigo-300">Employee Spotlight</p>
      <p className="mt-0.5 text-xs text-slate-400">Longest-tenured member of your team</p>

      <div className="mt-5 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white ring-1 ring-white/20">
          {getInitials(employee.name)}
        </span>
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold text-white">{employee.name}</h4>
          <p className="truncate text-xs text-slate-300">{employee.role}</p>
        </div>
        <div className="ml-auto shrink-0">
          <StatusBadge status={employee.status} />
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
          <span className="truncate">{employee.department}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
          <span className="truncate">{employee.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
          <span className="truncate">Joined {formatJoiningDate(employee.joiningDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
          <span className="truncate">{employee.role}</span>
        </div>
      </dl>
    </div>
  )
}

export default EmployeeSpotlight
