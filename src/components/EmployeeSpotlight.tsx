import { Building2, Calendar, Clock, MapPin } from 'lucide-react'
import type { Employee } from '../types/employee'
import StatusBadge from './StatusBadge'
import { formatJoiningDate, formatTenure, getInitials } from '../utils/formatting'

interface EmployeeSpotlightProps {
  employee: Employee
}

function EmployeeSpotlight({ employee }: EmployeeSpotlightProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">Employee Spotlight</p>
      <p className="mt-0.5 text-xs text-slate-400">Longest-tenured member of your team</p>

      <div className="mt-5 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
          {getInitials(employee.name)}
        </span>
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold text-slate-800">{employee.name}</h4>
          <p className="truncate text-xs text-slate-500">{employee.role}</p>
        </div>
        <div className="ml-auto shrink-0">
          <StatusBadge status={employee.status} />
        </div>
      </div>

      <dl className="mt-5 grid flex-1 grid-cols-2 content-start gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{employee.department}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{employee.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">Joined {formatJoiningDate(employee.joiningDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{formatTenure(employee.joiningDate)} tenure</span>
        </div>
      </dl>
    </div>
  )
}

export default EmployeeSpotlight
