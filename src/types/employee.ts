export const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Human Resources",
  "Finance",
  "Customer Support",
] as const

export type Department = (typeof DEPARTMENTS)[number]

export const EMPLOYEE_STATUSES = ["Active", "Inactive", "On Leave"] as const

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number]

export interface Employee {
  id: string
  name: string
  role: string
  department: Department
  email: string
  phone: string
  location: string
  status: EmployeeStatus
  joiningDate: string
}
