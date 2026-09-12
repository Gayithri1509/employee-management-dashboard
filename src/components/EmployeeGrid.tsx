import { SearchX } from 'lucide-react'
import type { Employee } from '../types/employee'
import EmployeeCard from './EmployeeCard'
import EmptyState from './EmptyState'

interface EmployeeGridProps {
  employees: Employee[]
  onEditEmployee: (employee: Employee) => void
  onResetFilters: () => void
}

function EmployeeGrid({ employees, onEditEmployee, onResetFilters }: EmployeeGridProps) {
  if (employees.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No employees match your filters"
        description="Try a different search term or adjust your department and status filters."
        actionLabel="Reset filters"
        onAction={onResetFilters}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {employees.map((employee, index) => (
        <div
          key={employee.id}
          className="animate-[fadeInUp_0.3s_ease-out_both] motion-reduce:animate-none"
          style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
        >
          <EmployeeCard employee={employee} onEdit={onEditEmployee} />
        </div>
      ))}
    </div>
  )
}

export default EmployeeGrid
