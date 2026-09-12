import type { Employee } from '../types/employee'
import EmployeeCard from './EmployeeCard'

interface EmployeeGridProps {
  employees: Employee[]
  onEditEmployee: (employee: Employee) => void
}

function EmployeeGrid({ employees, onEditEmployee }: EmployeeGridProps) {
  if (employees.length === 0) {
    return (
      <section className="px-6 py-4">
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500"
        >
          No employees match your current search and filters.
        </p>
      </section>
    )
  }

  return (
    <section className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3">
      {employees.map((employee) => (
        <EmployeeCard key={employee.id} employee={employee} onEdit={onEditEmployee} />
      ))}
    </section>
  )
}

export default EmployeeGrid
