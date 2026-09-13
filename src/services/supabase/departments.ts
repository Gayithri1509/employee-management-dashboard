// Typed data-access module for the `departments` table: reads (Stage 2)
// plus, as of Phase 2, department CRUD. Unlike employees, departments needs
// no RPC layer for its own CRUD -- migration 0012 already grants
// authenticated SELECT to everyone and INSERT/UPDATE/DELETE (via RLS) to
// admin/hr_manager only, and there is no column-level restriction to
// express (the whole row is either writable by a role or it isn't). Moving
// employees OUT of a department before deleting it, though, is an employees
// mutation -- that goes through the reassign_department_employees RPC from
// 0013, same as every other employees write.

import { supabase } from '../../lib/supabase'
import type { DepartmentRow } from '../../types/database'

export interface DepartmentsResult {
  data: DepartmentRow[] | null
  error: string | null
}

export interface DepartmentResult {
  data: DepartmentRow | null
  error: string | null
}

const DUPLICATE_NAME_ERROR = 'A department with this name already exists.'
const STILL_HAS_EMPLOYEES_ERROR = 'This department still has employees assigned to it.'

/** Fetches all departments, ordered by name. Surfaces errors, never throws. */
export async function fetchDepartments(): Promise<DepartmentsResult> {
  const { data, error } = await supabase.from('departments').select('*').order('name')

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/** Builds a department id -> department name lookup, for mapping employee rows. */
export function buildDepartmentNameById(departments: DepartmentRow[]): Record<string, string> {
  const nameById: Record<string, string> = {}

  for (const department of departments) {
    nameById[department.id] = department.name
  }

  return nameById
}

/** Creates a department. RLS restricts this to admin/hr_manager; anyone else gets a permission error from Postgres. */
export async function createDepartment(name: string): Promise<DepartmentResult> {
  const { data, error } = await supabase.from('departments').insert({ name }).select().single()

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: DUPLICATE_NAME_ERROR }
    }
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/** Renames a department. RLS restricts this to admin/hr_manager. */
export async function updateDepartment(id: string, name: string): Promise<DepartmentResult> {
  const { data, error } = await supabase.from('departments').update({ name }).eq('id', id).select().single()

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: DUPLICATE_NAME_ERROR }
    }
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Deletes a department. RLS restricts this to admin/hr_manager. The
 * employees.department_id foreign key has no ON DELETE action, so Postgres
 * itself refuses this (a foreign_key_violation, mapped to a friendly error
 * below) if any employee still belongs to the department -- callers should
 * still check countEmployeesInDepartment first for a clean UX (offering
 * reassignment) rather than relying on this as the only guard, but an
 * orphaned employee row is never possible even if that check is skipped.
 */
export async function deleteDepartment(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('departments').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return { error: STILL_HAS_EMPLOYEES_ERROR }
    }
    return { error: error.message }
  }

  return { error: null }
}

/** Counts employees currently assigned to a department, for the safe-deletion UX. */
export async function countEmployeesInDepartment(departmentId: string): Promise<{ count: number | null; error: string | null }> {
  const { count, error } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('department_id', departmentId)

  if (error) {
    return { count: null, error: error.message }
  }

  return { count: count ?? 0, error: null }
}

/**
 * Bulk-moves every employee out of one department and into another, via the
 * reassign_department_employees RPC (admin/hr_manager only, enforced
 * server-side). Used before deleting a department that still has employees.
 */
export async function reassignDepartmentEmployees(
  fromDepartmentId: string,
  toDepartmentId: string,
): Promise<{ count: number | null; error: string | null }> {
  const { data, error } = await supabase.rpc('reassign_department_employees', {
    p_from_department_id: fromDepartmentId,
    p_to_department_id: toDepartmentId,
  })

  if (error) {
    return { count: null, error: error.message }
  }

  return { count: data, error: null }
}
