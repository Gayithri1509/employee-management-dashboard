// Employee <-> profile self-service linking. Admin/HR Manager only,
// enforced server-side by the SECURITY DEFINER RPCs in
// supabase/migrations/0019_employee_profile_linking.sql. There is no
// email-based auto-linking anywhere in this module or its RPCs -- every
// link is an explicit admin/HR-Manager action naming both records.

import { supabase } from '../../lib/supabase'
import { humanizeError } from '../../utils/errors'

export interface LinkableProfile {
  id: string
  fullName: string | null
  email: string
}

export interface LinkableProfilesResult {
  data: LinkableProfile[] | null
  error: string | null
}

export interface LinkMutationResult {
  error: string | null
}

/** Lists profiles not yet linked to any employee, for the "Link Account" picker. Admin/HR Manager only. */
export async function fetchLinkableProfiles(): Promise<LinkableProfilesResult> {
  const { data, error } = await supabase.rpc('list_linkable_profiles')

  if (error) {
    return { data: null, error: humanizeError(error.message, 'Could not load linkable accounts. Please try again.') }
  }

  const profiles: LinkableProfile[] = (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
  }))

  return { data: profiles, error: null }
}

/** Links an employee record to an authenticated profile. Admin/HR Manager only; rejected server-side otherwise. */
export async function linkEmployeeProfile(employeeId: string, profileId: string): Promise<LinkMutationResult> {
  const { error } = await supabase.rpc('link_employee_profile', {
    p_employee_id: employeeId,
    p_target_profile_id: profileId,
  })

  if (error) {
    return { error: humanizeError(error.message, 'Could not link this employee. Please try again.') }
  }

  return { error: null }
}

/** Removes an employee's self-service link. Admin/HR Manager only; rejected server-side otherwise. */
export async function unlinkEmployeeProfile(employeeId: string): Promise<LinkMutationResult> {
  const { error } = await supabase.rpc('unlink_employee_profile', { p_employee_id: employeeId })

  if (error) {
    return { error: humanizeError(error.message, 'Could not unlink this employee. Please try again.') }
  }

  return { error: null }
}
