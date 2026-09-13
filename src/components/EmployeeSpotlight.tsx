import { Building2, Calendar, Clock, MapPin } from 'lucide-react'
import type { Employee } from '../types/employee'
import StatusBadge from './StatusBadge'
import { formatJoiningDate, formatTenure, getInitials } from '../utils/formatting'

interface EmployeeSpotlightProps {
  employee: Employee
}

function EmployeeSpotlight({ employee }: EmployeeSpotlightProps) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl"
      />
      <p className="relative text-xs font-medium uppercase tracking-wide text-indigo-300">Employee Spotlight</p>
      <p className="relative mt-0.5 text-xs text-slate-400">Longest-tenured member of your team</p>

      <div className="relative mt-5 flex items-center gap-4">
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

      <dl className="relative mt-5 grid flex-1 grid-cols-2 content-start gap-3 text-xs text-slate-300">
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
          <Clock className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
          <span className="truncate">{formatTenure(employee.joiningDate)} tenure</span>
        </div>
      </dl>
    </div>
  )
}

export default EmployeeSpotlight
