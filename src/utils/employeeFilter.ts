import type { Employee } from '../types/employee'

export interface EmployeeFilters {
  searchTerm: string
  department: string
  status: string
}

/**
 * Applies search + department + status together (AND, not OR) -- a result
 * must satisfy every active condition, matching this app's stated filter
 * behavior. 'all' means "no constraint" for department/status. Search is
 * case-insensitive across name, role, department, email, and location.
 */
export function filterEmployees(employees: Employee[], filters: EmployeeFilters): Employee[] {
  const normalizedQuery = filters.searchTerm.trim().toLowerCase()

  return employees.filter((employee) => {
    const matchesSearch =
      normalizedQuery === '' ||
      employee.name.toLowerCase().includes(normalizedQuery) ||
      employee.role.toLowerCase().includes(normalizedQuery) ||
      employee.department.toLowerCase().includes(normalizedQuery) ||
      employee.email.toLowerCase().includes(normalizedQuery) ||
      employee.location.toLowerCase().includes(normalizedQuery)

    const matchesDepartment = filters.department === 'all' || employee.department === filters.department
    const matchesStatus = filters.status === 'all' || employee.status === filters.status

    return matchesSearch && matchesDepartment && matchesStatus
  })
}
