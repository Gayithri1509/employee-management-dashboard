// Typed data-access module for the `employees` table: read functions (Stage
// 2) plus the mapping/adapter between the database representation
// (department_id: a UUID foreign key) and the app's Employee representation
// (department: a name string) -- and, as of Phase 2, the mutation functions.
//
// Mutations never touch the employees table directly. Migration 0012 grants
// `authenticated` SELECT-only access to employees -- there is no client
// INSERT/UPDATE/DELETE policy, by design (see 0012's own comments). Instead,
// every mutation calls a SECURITY DEFINER RPC from
// supabase/migrations/0013_employee_mutation_rpcs.sql, which enforces the
// role/column permission model server-side (RLS is row-level only; column-
// level rules like "hr_staff may not change department" need a function).
// created_by/updated_by and the audit trail are handled entirely by the
// database (the RPC sets the actor from auth.uid(); the existing
// employees_audit_trigger fires on the resulting row change) -- nothing
// here ever writes to activity_logs or fabricates an actor.

import { supabase } from '../../lib/supabase'
import type { EmployeeRow } from '../../types/database'
import { EMPLOYEE_STATUSES, type Employee, type EmployeeStatus } from '../../types/employee'
import { buildDepartmentNameById, fetchDepartments } from './departments'

export interface EmployeesResult {
  data: Employee[] | null
  error: string | null
}

const EMPLOYEE_STATUS_VALUES: readonly string[] = EMPLOYEE_STATUSES

function isEmployeeStatus(value: string): value is EmployeeStatus {
  return EMPLOYEE_STATUS_VALUES.includes(value)
}

/**
 * Maps one database employee row to the app's existing Employee shape,
 * resolving department_id to a department name via the supplied lookup.
 * Any real department name is accepted -- department is a dynamic, DB-owned
 * value (see src/types/employee.ts), not a fixed set checked here.
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

  if (!departmentName || !isEmployeeStatus(row.status)) {
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

/** The employee fields a caller supplies when creating or editing an employee (never id/status). */
export interface EmployeeFormInput {
  name: string
  role: string
  departmentId: string
  email: string
  phone: string
  location: string
  joiningDate: string
}

export interface EmployeeMutationResult {
  data: Employee | null
  error: string | null
}

function mapMutatedRow(row: EmployeeRow | null, departmentNameById: Record<string, string>): EmployeeMutationResult {
  if (!row) {
    return { data: null, error: 'The database did not return the saved employee.' }
  }

  const mapped = mapEmployeeRowToEmployee(row, departmentNameById)

  if (!mapped) {
    return { data: null, error: 'Employee saved, but could not be displayed (unrecognized department or status).' }
  }

  return { data: mapped, error: null }
}

/** Creates an employee via the create_employee RPC. admin/hr_manager/hr_staff only (enforced server-side). */
export async function createEmployee(
  input: EmployeeFormInput,
  departmentNameById: Record<string, string>,
): Promise<EmployeeMutationResult> {
  const { data, error } = await supabase.rpc('create_employee', {
    p_name: input.name,
    p_role: input.role,
    p_department_id: input.departmentId,
    p_email: input.email,
    p_phone: input.phone || null,
    p_location: input.location || null,
    p_joining_date: input.joiningDate,
  })

  if (error) {
    return { data: null, error: error.message }
  }

  return mapMutatedRow(data, departmentNameById)
}

/**
 * Edits an employee's operational fields via the update_employee RPC.
 * admin/hr_manager/hr_staff only; hr_staff changing department_id is
 * rejected server-side (the RPC raises, surfaced here as `error`).
 */
export async function updateEmployee(
  employeeId: string,
  input: EmployeeFormInput,
  departmentNameById: Record<string, string>,
): Promise<EmployeeMutationResult> {
  const { data, error } = await supabase.rpc('update_employee', {
    p_id: employeeId,
    p_name: input.name,
    p_role: input.role,
    p_department_id: input.departmentId,
    p_email: input.email,
    p_phone: input.phone || null,
    p_location: input.location || null,
    p_joining_date: input.joiningDate,
  })

  if (error) {
    return { data: null, error: error.message }
  }

  return mapMutatedRow(data, departmentNameById)
}

/** Deactivates/reactivates/otherwise changes status via set_employee_status. admin/hr_manager only. */
export async function setEmployeeStatus(
  employeeId: string,
  status: EmployeeStatus,
  departmentNameById: Record<string, string>,
): Promise<EmployeeMutationResult> {
  const { data, error } = await supabase.rpc('set_employee_status', {
    p_id: employeeId,
    p_status: status,
  })

  if (error) {
    return { data: null, error: error.message }
  }

  return mapMutatedRow(data, departmentNameById)
}

/** Hard-deletes an employee via delete_employee. admin only (enforced server-side). */
export async function deleteEmployee(employeeId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_employee', { p_id: employeeId })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

/** Employee self-service field input -- deliberately just phone/location, matching update_employee_self's parameters. */
export interface EmployeeSelfServiceInput {
  phone: string
  location: string
}

/**
 * Employee self-service update via update_employee_self. There is no
 * employee-id parameter -- the RPC targets only the caller's own linked row
 * (profile_id = auth.uid()), so this can never affect another employee.
 */
export async function updateEmployeeSelf(
  input: EmployeeSelfServiceInput,
  departmentNameById: Record<string, string>,
): Promise<EmployeeMutationResult> {
  const { data, error } = await supabase.rpc('update_employee_self', {
    p_phone: input.phone || null,
    p_location: input.location || null,
  })

  if (error) {
    return { data: null, error: error.message }
  }

  return mapMutatedRow(data, departmentNameById)
}
