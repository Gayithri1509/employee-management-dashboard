import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Employee } from '../types/employee'
import type { ActivityEntry } from '../types/activity'
import type { Announcement } from '../types/announcement'
import type { DepartmentRow } from '../types/database'
import { fetchEmployeesWithDepartments } from '../services/supabase/employees'
import { fetchDepartments, buildDepartmentNameById } from '../services/supabase/departments'
import { fetchActivityEntries } from '../services/supabase/activityLogs'
import { fetchAnnouncements, fetchMyReadAnnouncementIds } from '../services/supabase/announcements'

export interface OrgData {
  employees: Employee[]
  departments: DepartmentRow[]
  activityEntries: ActivityEntry[]
  announcements: Announcement[]
  readAnnouncementIds: Set<string>
  departmentNameById: Record<string, string>
  loading: boolean
  employeesError: string | null
  departmentsError: string | null
  activityError: string | null
  announcementsError: string | null
  /** Re-fetches everything. Call after any employee/department mutation so the UI reflects the real database state. */
  refreshAll: () => Promise<void>
  /** Re-fetches with a visible loading indicator -- used by the full-page ErrorState's Retry action. */
  retryAll: () => void
  retryActivity: () => Promise<void>
  /** Re-fetches only announcements + the caller's read state -- used after marking one/all as read, so a full org-data refetch isn't needed for that. */
  refreshAnnouncements: () => Promise<void>
}

/**
 * Loads employees, departments, and activity from Supabase and keeps them
 * in one place so every route (Overview, Employees, Departments, Activity,
 * My Profile) reads the same data instead of each re-fetching independently.
 * See src/layouts/AppLayout.tsx, which owns the single instance of this hook
 * and shares it down via the router's Outlet context.
 */
export function useOrgData(onWarning: (message: string) => void): OrgData {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [employeesError, setEmployeesError] = useState<string | null>(null)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null)

  // No setState call happens before the first `await` here on purpose: the
  // mount effect below calls this directly, and a synchronous setState in
  // that path causes an extra render pass for no benefit (the `loading`
  // state used on mount is already `true` by its initial value).
  //
  // Wrapped in useCallback so the mount effect can list it as a dependency
  // (satisfying exhaustive-deps) without that dependency changing on every
  // render -- setState setters are referentially stable, and `onWarning` is
  // expected to be stable too (AppLayout passes setToastMessage directly).
  const refreshAll = useCallback(async () => {
    const [employeesResult, departmentsResult, activityResult, announcementsResult, readIdsResult] = await Promise.all([
      fetchEmployeesWithDepartments(),
      fetchDepartments(),
      fetchActivityEntries(),
      fetchAnnouncements(),
      fetchMyReadAnnouncementIds(),
    ])

    if (employeesResult.data) {
      setEmployees(employeesResult.data)
      setEmployeesError(null)
      if (employeesResult.error) {
        onWarning(employeesResult.error)
      }
    } else {
      setEmployees([])
      setEmployeesError(employeesResult.error ?? 'Failed to load employees.')
    }

    if (departmentsResult.data) {
      setDepartments(departmentsResult.data)
      setDepartmentsError(null)
    } else {
      setDepartments([])
      setDepartmentsError(departmentsResult.error ?? 'Failed to load departments.')
    }

    if (activityResult.data) {
      setActivityEntries(activityResult.data)
      setActivityError(null)
      if (activityResult.error) {
        onWarning(activityResult.error)
      }
    } else {
      setActivityEntries([])
      setActivityError(activityResult.error ?? 'Failed to load activity log.')
    }

    if (announcementsResult.data) {
      setAnnouncements(announcementsResult.data)
      setAnnouncementsError(null)
    } else {
      setAnnouncements([])
      setAnnouncementsError(announcementsResult.error ?? 'Failed to load company communications.')
    }

    if (readIdsResult.data) {
      setReadAnnouncementIds(readIdsResult.data)
    }

    setLoading(false)
  }, [onWarning])

  const refreshAnnouncements = useCallback(async () => {
    const [announcementsResult, readIdsResult] = await Promise.all([fetchAnnouncements(), fetchMyReadAnnouncementIds()])

    if (announcementsResult.data) {
      setAnnouncements(announcementsResult.data)
      setAnnouncementsError(null)
    } else {
      setAnnouncementsError(announcementsResult.error ?? 'Failed to load company communications.')
    }

    if (readIdsResult.data) {
      setReadAnnouncementIds(readIdsResult.data)
    }
  }, [])

  useEffect(() => {
    void refreshAll()
    // Retries beyond the mount fetch are user-initiated (see retryAll/retryActivity).
  }, [refreshAll])

  // Called from a click handler (the ErrorState "Retry" button), not an
  // effect, so a synchronous setState here is fine and gives the retry its
  // own loading indicator.
  function retryAll() {
    setLoading(true)
    void refreshAll()
  }

  async function retryActivity() {
    setActivityError(null)
    const result = await fetchActivityEntries()

    if (result.data) {
      setActivityEntries(result.data)
      if (result.error) {
        onWarning(result.error)
      }
    } else {
      setActivityEntries([])
      setActivityError(result.error ?? 'Failed to load activity log.')
    }
  }

  const departmentNameById = useMemo(() => buildDepartmentNameById(departments), [departments])

  return {
    employees,
    departments,
    activityEntries,
    announcements,
    readAnnouncementIds,
    departmentNameById,
    loading,
    employeesError,
    departmentsError,
    activityError,
    announcementsError,
    refreshAll,
    retryAll,
    retryActivity,
    refreshAnnouncements,
  }
}
