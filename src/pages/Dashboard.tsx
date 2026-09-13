import { useEffect, useState } from 'react'
import { Building2, CalendarClock, UserCheck, Users } from 'lucide-react'
import type { Employee } from '../types/employee'
import type { ActivityEntry } from '../types/activity'
import type { DepartmentRow } from '../types/database'
import { type SectionId } from '../types/navigation'
import { fetchEmployeesWithDepartments } from '../services/supabase/employees'
import { fetchDepartments } from '../services/supabase/departments'
import { fetchActivityEntries } from '../services/supabase/activityLogs'
import Sidebar from '../components/layout/Sidebar'
import TopHeader from '../components/layout/TopHeader'
import KpiCard from '../components/kpi/KpiCard'
import WorkforcePulse from '../components/insights/WorkforcePulse'
import DepartmentIntelligence from '../components/insights/DepartmentIntelligence'
import EmployeeSpotlight from '../components/EmployeeSpotlight'
import QuickActions from '../components/QuickActions'
import EmployeeDirectory from '../components/EmployeeDirectory'
import ActivityLogPanel from '../components/ActivityLogPanel'
import ProductInsights from '../components/ProductInsights'
import Toast from '../components/Toast'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

function Dashboard() {
  // Phase 1: employees, departments, and activity all load from Supabase
  // (public.employees / public.departments / public.activity_logs) through
  // the existing service layer -- there is no localStorage or demo-data
  // fallback. Each resource tracks its own error so a failure in one (most
  // likely activity, the least critical) doesn't have to take down the rest
  // of the dashboard.
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([])

  const [loading, setLoading] = useState(true)
  const [employeesError, setEmployeesError] = useState<string | null>(null)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [department, setDepartment] = useState('all')
  const [status, setStatus] = useState('all')

  // Application-shell UI state: which section the sidebar highlights,
  // whether the mobile nav drawer is open, and the save-confirmation /
  // data-warning toast. None of this is persisted.
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (toastMessage === null) return
    const timeoutId = window.setTimeout(() => setToastMessage(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  // No setState call happens before the first `await` here on purpose: the
  // mount effect below calls this directly, and a synchronous setState in
  // that path causes an extra render pass for no benefit (the `loading`
  // state used on mount is already `true` by its initial value).
  async function loadDashboardData() {
    const [employeesResult, departmentsResult, activityResult] = await Promise.all([
      fetchEmployeesWithDepartments(),
      fetchDepartments(),
      fetchActivityEntries(),
    ])

    if (employeesResult.data) {
      setEmployees(employeesResult.data)
      setEmployeesError(null)
      if (employeesResult.error) {
        setToastMessage(employeesResult.error)
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
        setToastMessage(activityResult.error)
      }
    } else {
      setActivityEntries([])
      setActivityError(activityResult.error ?? 'Failed to load activity log.')
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadDashboardData()
    // Intentionally runs once on mount -- there is no dependency that should
    // re-trigger a full reload; retries are user-initiated (see ErrorState).
  }, [])

  // Called from the ErrorState "Retry" button (a click handler, not an
  // effect), so setting `loading` synchronously here is safe and gives the
  // retry its own loading indicator.
  function retryAll() {
    setLoading(true)
    void loadDashboardData()
  }

  async function retryActivity() {
    setActivityError(null)
    const result = await fetchActivityEntries()

    if (result.data) {
      setActivityEntries(result.data)
      if (result.error) {
        setToastMessage(result.error)
      }
    } else {
      setActivityEntries([])
      setActivityError(result.error ?? 'Failed to load activity log.')
    }
  }

  const hasCoreError = employeesError !== null || departmentsError !== null

  // Dashboard-wide stats, always derived from the full employees array (not
  // the filtered/displayed list) so they reflect true organization totals
  // regardless of any active search or filter. Departments is the one KPI
  // that must NOT be derived from the employees array -- it comes from the
  // real departments table, so it stays correct even for a department with
  // zero current employees.
  const activeCount = employees.filter((employee) => employee.status === 'Active').length
  const onLeaveCount = employees.filter((employee) => employee.status === 'On Leave').length
  const inactiveCount = employees.filter((employee) => employee.status === 'Inactive').length
  const departmentCount = departments.length
  const departmentNames = departments.map((dept) => dept.name)

  const departmentBreakdown = departments
    .map((dept) => ({
      department: dept.name,
      count: employees.filter((employee) => employee.department === dept.name).length,
    }))
    .sort((a, b) => b.count - a.count)

  // Deterministic, data-driven spotlight: the employee with the earliest
  // joining date (ISO date strings compare lexicographically = chronologically).
  const spotlightEmployee = employees.reduce<Employee | undefined>(
    (longestTenured, employee) =>
      !longestTenured || employee.joiningDate < longestTenured.joiningDate ? employee : longestTenured,
    undefined
  )

  const normalizedQuery = searchTerm.trim().toLowerCase()

  const displayedEmployees = employees.filter((employee) => {
    const matchesSearch =
      normalizedQuery === '' ||
      employee.name.toLowerCase().includes(normalizedQuery) ||
      employee.role.toLowerCase().includes(normalizedQuery) ||
      employee.department.toLowerCase().includes(normalizedQuery) ||
      employee.email.toLowerCase().includes(normalizedQuery)

    const matchesDepartment = department === 'all' || employee.department === department
    const matchesStatus = status === 'all' || employee.status === status

    return matchesSearch && matchesDepartment && matchesStatus
  })

  const hasActiveFilters = searchTerm.trim() !== '' || department !== 'all' || status !== 'all'

  function handleResetFilters() {
    setSearchTerm('')
    setDepartment('all')
    setStatus('all')
  }

  function handleNavigate(sectionId: SectionId) {
    setActiveSection(sectionId)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  // Employee CRUD (including edit) is a later phase: real mutations need
  // secure RLS policies/RPCs designed alongside the CRUD UI. Editing is
  // surfaced but intentionally inert here rather than mutating local state
  // in a way that would silently diverge from the database.
  function handleEditEmployee(_employee: Employee) {
    setToastMessage('Employee editing will be available once secure update policies ship in the CRUD phase.')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
        <TopHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenActivity={() => handleNavigate('activity')}
          activityCount={activityEntries.length}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {loading ? (
            <LoadingState message="Loading employees, departments, and activity from Supabase…" />
          ) : hasCoreError ? (
            <ErrorState
              message={
                employeesError && departmentsError
                  ? `${employeesError} ${departmentsError}`
                  : (employeesError ?? departmentsError ?? 'Something went wrong while loading the dashboard.')
              }
              onRetry={retryAll}
            />
          ) : (
            <>
              <section id="overview" className="scroll-mt-20 space-y-6">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-sm sm:px-8">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl"
                  />
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-300">Workforce Overview</p>
                  <h2 className="relative mt-1 max-w-xl text-2xl font-semibold sm:text-3xl">
                    Monitor your organization, people, and activity from one place.
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    label="Total Employees"
                    value={employees.length}
                    helperText="Across all departments"
                    icon={Users}
                    accent="indigo"
                  />
                  <KpiCard
                    label="Active"
                    value={activeCount}
                    helperText={`${employees.length === 0 ? 0 : Math.round((activeCount / employees.length) * 100)}% of workforce`}
                    icon={UserCheck}
                    accent="emerald"
                  />
                  <KpiCard label="On Leave" value={onLeaveCount} helperText="Temporarily away" icon={CalendarClock} accent="amber" />
                  <KpiCard
                    label="Departments"
                    value={departmentCount}
                    helperText="Represented in your team"
                    icon={Building2}
                    accent="slate"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <WorkforcePulse active={activeCount} onLeave={onLeaveCount} inactive={inactiveCount} total={employees.length} />
                  <DepartmentIntelligence breakdown={departmentBreakdown} total={employees.length} />
                  {spotlightEmployee && <EmployeeSpotlight employee={spotlightEmployee} />}
                </div>

                <QuickActions
                  onViewEmployees={() => handleNavigate('employees')}
                  onViewActivity={() => handleNavigate('activity')}
                />
              </section>

              <section id="employees" className="scroll-mt-20 mt-10">
                <EmployeeDirectory
                  employees={displayedEmployees}
                  totalCount={employees.length}
                  searchTerm={searchTerm}
                  department={department}
                  status={status}
                  departments={departmentNames}
                  onSearchChange={setSearchTerm}
                  onDepartmentChange={setDepartment}
                  onStatusChange={setStatus}
                  onEditEmployee={handleEditEmployee}
                  hasActiveFilters={hasActiveFilters}
                  onResetFilters={handleResetFilters}
                />
              </section>

              <section id="activity" className="scroll-mt-20 mt-10">
                {activityError ? (
                  <ErrorState message={activityError} onRetry={() => void retryActivity()} />
                ) : (
                  <ActivityLogPanel entries={activityEntries} />
                )}
              </section>

              <section id="insights" className="scroll-mt-20 mb-6 mt-10">
                <ProductInsights />
              </section>
            </>
          )}
        </main>
      </div>

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default Dashboard
