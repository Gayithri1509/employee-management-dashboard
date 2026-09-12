// Stage 2: typed data-access module for the `employees` table, plus the
// mapping/adapter between the database representation (department_id: a
// UUID foreign key) and the existing frontend Employee representation
// (department: a Department name string). See docs/supabase-client-setup.md.
//
// Nothing in this file is imported by presentational components yet, and the
// dashboard still reads/writes localStorage via src/services/storage.ts --
// this module is not wired into the app this stage.

import { supabase } from '../../lib/supabase'
import type { EmployeeRow } from '../../types/database'
import { DEPARTMENTS, EMPLOYEE_STATUSES, type Employee } from '../../types/employee'
import { buildDepartmentNameById, fetchDepartments } from './departments'

export interface EmployeesResult {
  data: Employee[] | null
  error: string | null
}

const DEPARTMENT_NAMES: readonly string[] = DEPARTMENTS
const EMPLOYEE_STATUS_VALUES: readonly string[] = EMPLOYEE_STATUSES

function isDepartmentName(value: string): value is Employee['department'] {
  return DEPARTMENT_NAMES.includes(value)
}

function isEmployeeStatus(value: string): value is Employee['status'] {
  return EMPLOYEE_STATUS_VALUES.includes(value)
}

/**
 * Maps one database employee row to the app's existing Employee shape,
 * resolving department_id to a department name via the supplied lookup.
 *
 * Returns null (rather than throwing) if the row's department_id has no
 * matching department, or its status is not one of the app's known
 * statuses -- callers are expected to collect and surface these as errors
 * instead of silently dropping rows.
 */
export function mapEmployeeRowToEmployee(
  row: EmployeeRow,
  departmentNameById: Record<string, string>,
): Employee | null {
  const departmentName = departmentNameById[row.department_id]

  if (!departmentName || !isDepartmentName(departmentName) || !isEmployeeStatus(row.status)) {
    return null
  }

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: departmentName,
    email: row.email,
    phone: row.phone ?? '',
    location: row.location ?? '',
    status: row.status,
    joiningDate: row.joining_date,
  }
}

/** Fetches raw employee rows (database shape), ordered by name. */
export async function fetchEmployeeRows(): Promise<{ data: EmployeeRow[] | null; error: string | null }> {
  const { data, error } = await supabase.from('employees').select('*').order('name')

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Fetches employees and departments, and maps them to the app's existing
 * Employee shape. Any row that fails to map (unknown department_id or
 * status) is skipped and reported in `error` rather than silently dropped;
 * successfully mapped employees are still returned in `data` alongside it.
 */
export async function fetchEmployeesWithDepartments(): Promise<EmployeesResult> {
  const departmentsResult = await fetchDepartments()

  if (departmentsResult.error || !departmentsResult.data) {
    return { data: null, error: departmentsResult.error ?? 'Failed to load departments.' }
  }

  const departmentNameById = buildDepartmentNameById(departmentsResult.data)

  const rowsResult = await fetchEmployeeRows()

  if (rowsResult.error || !rowsResult.data) {
    return { data: null, error: rowsResult.error ?? 'Failed to load employees.' }
  }

  const employees: Employee[] = []
  const unmapped: string[] = []

  for (const row of rowsResult.data) {
    const mapped = mapEmployeeRowToEmployee(row, departmentNameById)

    if (mapped) {
      employees.push(mapped)
    } else {
      unmapped.push(`${row.name} (${row.id})`)
    }
  }

  if (unmapped.length > 0) {
    return {
      data: employees,
      error: `${unmapped.length} employee row(s) could not be mapped (unrecognized department or status): ${unmapped.join(', ')}`,
    }
  }

  return { data: employees, error: null }
}
