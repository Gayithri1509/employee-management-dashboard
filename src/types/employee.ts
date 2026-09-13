export const EMPLOYEE_STATUSES = ["Active", "Inactive", "On Leave"] as const

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number]

export interface Employee {
  id: string
  name: string
  role: string
  // A department NAME resolved from the real public.departments table (see
  // mapEmployeeRowToEmployee), not a fixed compile-time union. Departments
  // can be created/renamed via Department CRUD, so this must stay a plain
  // string -- a hardcoded union would silently fail to map any employee in
  // a department created after the union was written.
  department: string
  email: string
  phone: string
  location: string
  status: EmployeeStatus
  joiningDate: string
}
