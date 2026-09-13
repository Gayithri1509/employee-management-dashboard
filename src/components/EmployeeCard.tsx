import { Building2, Calendar, Mail, MapPin, Pencil, Phone, Power, Trash2 } from 'lucide-react'
import type { Employee } from '../types/employee'
import StatusBadge from './StatusBadge'
import { formatJoiningDate, getInitials } from '../utils/formatting'

interface EmployeeCardProps {
  employee: Employee
  canEdit: boolean
  canToggleStatus: boolean
  canDelete: boolean
  isBusy: boolean
  onEdit: (employee: Employee) => void
  onToggleStatus: (employee: Employee) => void
  onDelete: (employee: Employee) => void
}

const AVATAR_PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
]

function avatarColorFor(id: string): string {
  const sum = id.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length]
}

const actionButtonClass =
  'flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-600'

function EmployeeCard({ employee, canEdit, canToggleStatus, canDelete, isBusy, onEdit, onToggleStatus, onDelete }: EmployeeCardProps) {
  const isActive = employee.status === 'Active'

  return (
    <div className="group flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md motion-reduce:hover:translate-y-0">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColorFor(employee.id)}`}
        >
          {getInitials(employee.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-800">{employee.name}</h3>
            <StatusBadge status={employee.status} />
          </div>
          <p className="truncate text-xs text-slate-500">{employee.role}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          <Building2 className="h-3 w-3" />
          {employee.department}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <p className="flex items-center gap-2 truncate">
          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{employee.email}</span>
        </p>
        <p className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {employee.phone}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {employee.location}
        </p>
        <p className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          Joined {formatJoiningDate(employee.joiningDate)}
        </p>
      </div>

      {(canEdit || canToggleStatus || canDelete) && (
        <div className="mt-auto flex gap-2 pt-3">
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(employee)}
              disabled={isBusy}
              aria-label={`Edit ${employee.name}`}
              className={actionButtonClass}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
          {canToggleStatus && (
            <button
              type="button"
              onClick={() => onToggleStatus(employee)}
              disabled={isBusy}
              aria-label={`${isActive ? 'Deactivate' : 'Reactivate'} ${employee.name}`}
              title={isActive ? 'Deactivate' : 'Reactivate'}
              className={actionButtonClass}
            >
              <Power className="h-3.5 w-3.5" />
              {isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(employee)}
              disabled={isBusy}
              aria-label={`Delete ${employee.name}`}
              title="Delete"
              className={`${actionButtonClass} flex-none px-2.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmployeeCard
