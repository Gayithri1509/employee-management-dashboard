// Stage 2: typed data-access module for the `departments` table.
//
// Nothing in this file is imported by presentational components yet -- see
// docs/supabase-client-setup.md.

import { supabase } from '../../lib/supabase'
import type { DepartmentRow } from '../../types/database'

export interface DepartmentsResult {
  data: DepartmentRow[] | null
  error: string | null
}

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
