import type { Employee, EmployeeStatus } from '../types/employee'

export const SORT_OPTIONS = ['name-asc', 'name-desc', 'joining-newest', 'joining-oldest', 'status'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export const SORT_OPTION_LABELS: Record<SortOption, string> = {
  'name-asc': 'Name (A–Z)',
  'name-desc': 'Name (Z–A)',
  'joining-newest': 'Joining date (Newest)',
  'joining-oldest': 'Joining date (Oldest)',
  status: 'Status',
}

const STATUS_ORDER: Record<EmployeeStatus, number> = {
  Active: 0,
  'On Leave': 1,
  Inactive: 2,
}

/** Returns a new sorted array -- never mutates `employees`, so sorting can never corrupt the underlying data. */
export function sortEmployees(employees: Employee[], sortBy: SortOption): Employee[] {
  const sorted = [...employees]

  switch (sortBy) {
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name))
      break
    case 'joining-newest':
      sorted.sort((a, b) => (a.joiningDate < b.joiningDate ? 1 : a.joiningDate > b.joiningDate ? -1 : 0))
      break
    case 'joining-oldest':
      sorted.sort((a, b) => (a.joiningDate < b.joiningDate ? -1 : a.joiningDate > b.joiningDate ? 1 : 0))
      break
    case 'status':
      sorted.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
      break
  }

  return sorted
}
