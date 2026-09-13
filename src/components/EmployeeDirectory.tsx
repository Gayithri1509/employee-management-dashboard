import { PlusCircle, RotateCcw, Users } from 'lucide-react'
import type { Employee } from '../types/employee'
import type { SortOption } from '../utils/employeeSort'
import ControlsBar from './ControlsBar'
import EmployeeGrid from './EmployeeGrid'
import EmptyState from './EmptyState'

interface EmployeeDirectoryProps {
  employees: Employee[]
  totalCount: number
  searchTerm: string
  department: string
  status: string
  sortBy: SortOption
  departments: string[]
  canCreateEmployee: boolean
  canEdit: boolean
  canToggleStatus: boolean
  canDelete: boolean
  busyEmployeeId: string | null
  onSearchChange: (value: string) => void
  onDepartmentChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSortChange: (value: SortOption) => void
  onAddEmployee: () => void
  onEditEmployee: (employee: Employee) => void
  onToggleStatus: (employee: Employee) => void
  onDeleteEmployee: (employee: Employee) => void
  hasActiveFilters: boolean
  onResetFilters: () => void
}

function EmployeeDirectory({
  employees,
  totalCount,
  searchTerm,
  department,
  status,
  sortBy,
  departments,
  canCreateEmployee,
  canEdit,
  canToggleStatus,
  canDelete,
  busyEmployeeId,
  onSearchChange,
  onDepartmentChange,
  onStatusChange,
  onSortChange,
  onAddEmployee,
  onEditEmployee,
  onToggleStatus,
  onDeleteEmployee,
  hasActiveFilters,
  onResetFilters,
}: EmployeeDirectoryProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Employee Directory</h2>
            <p className="text-xs text-slate-400">
              {employees.length} of {totalCount} {totalCount === 1 ? 'employee' : 'employees'} shown
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset filters
            </button>
          )}
          {canCreateEmployee && (
            <button
              type="button"
              onClick={onAddEmployee}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Employee
            </button>
          )}
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={Users}
            title="No employees yet"
            description="Employees added to the organization will appear here."
          />
        </div>
      ) : (
        <>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <ControlsBar
              searchTerm={searchTerm}
              onSearchChange={onSearchChange}
              department={department}
              status={status}
              sortBy={sortBy}
              onDepartmentChange={onDepartmentChange}
              onStatusChange={onStatusChange}
              onSortChange={onSortChange}
              departments={departments}
            />
          </div>

          <div className="mt-5">
            <EmployeeGrid
              employees={employees}
              canEdit={canEdit}
              canToggleStatus={canToggleStatus}
              canDelete={canDelete}
              busyEmployeeId={busyEmployeeId}
              onEditEmployee={onEditEmployee}
              onToggleStatus={onToggleStatus}
              onDeleteEmployee={onDeleteEmployee}
              onResetFilters={onResetFilters}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default EmployeeDirectory
