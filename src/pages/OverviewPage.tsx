import { useNavigate } from 'react-router-dom'
import { Building2, History, PlusCircle, UserCheck, UserPlus, Users } from 'lucide-react'
import type { Employee } from '../types/employee'
import { useAuth } from '../contexts/AuthContext'
import { useAppOutletContext } from '../layouts/appOutletContext'
import KpiCard from '../components/kpi/KpiCard'
import WorkforcePulse from '../components/insights/WorkforcePulse'
import DepartmentIntelligence from '../components/insights/DepartmentIntelligence'
import EmployeeSpotlight from '../components/EmployeeSpotlight'
import CompanyUpdatesCard from '../components/CompanyUpdatesCard'
import QuickActions from '../components/QuickActions'
import ActivityLogEntry from '../components/ActivityLogEntry'
import EmptyState from '../components/EmptyState'
import OverviewSkeleton from '../components/OverviewSkeleton'
import ErrorState from '../components/ErrorState'

const NEW_JOINER_WINDOW_DAYS = 30
const MS_PER_DAY = 1000 * 60 * 60 * 24
const RECENT_ACTIVITY_LIMIT = 5

const TODAY_LABEL = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

function OverviewPage() {
  const { employees, departments, activityEntries, announcements, loading, employeesError, departmentsError, retryAll, capabilities } =
    useAppOutletContext()
  const { profile, user } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return <OverviewSkeleton />
  }

  if (employeesError || departmentsError) {
    return (
      <ErrorState
        message={
          employeesError && departmentsError
            ? `${employeesError} ${departmentsError}`
            : (employeesError ?? departmentsError ?? 'Something went wrong while loading the dashboard.')
        }
        onRetry={retryAll}
      />
    )
  }

  const displayName = profile?.full_name?.trim() || user?.email || ''
  const firstName = displayName.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const activeCount = employees.filter((employee) => employee.status === 'Active').length
  const onLeaveCount = employees.filter((employee) => employee.status === 'On Leave').length
  const inactiveCount = employees.filter((employee) => employee.status === 'Inactive').length
  const departmentCount = departments.length

  const newJoinerCount = employees.filter((employee) => {
    const joined = new Date(employee.joiningDate)
    if (Number.isNaN(joined.getTime())) return false
    return (Date.now() - joined.getTime()) / MS_PER_DAY <= NEW_JOINER_WINDOW_DAYS
  }).length

  const departmentBreakdown = departments
    .map((dept) => ({
      department: dept.name,
      count: employees.filter((employee) => employee.department === dept.name).length,
      activeCount: employees.filter((employee) => employee.department === dept.name && employee.status === 'Active').length,
    }))
    .sort((a, b) => b.count - a.count)

  // Deterministic, data-driven spotlight: the employee with the earliest
  // joining date (ISO date strings compare lexicographically = chronologically).
  const spotlightEmployee = employees.reduce<Employee | undefined>(
    (longestTenured, employee) =>
      !longestTenured || employee.joiningDate < longestTenured.joiningDate ? employee : longestTenured,
    undefined,
  )

  const recentActivity = activityEntries.slice(0, RECENT_ACTIVITY_LIMIT)

  return (
    <div className="scroll-mt-20 space-y-6">
      {/* Executive header */}
      <div className="surface-elevated flex flex-wrap items-center justify-between gap-4 overflow-hidden p-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-6 -top-10 h-40 w-40 rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(closest-side, var(--color-brand), transparent)' }}
        />
        <div className="relative min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">People Operations Overview</h2>
          <p className="mt-1 text-sm text-slate-500">
            {employees.length} people across {departmentCount} {departmentCount === 1 ? 'department' : 'departments'}
            {onLeaveCount > 0 || inactiveCount > 0
              ? ` — ${activeCount} active, ${onLeaveCount + inactiveCount} need attention.`
              : ' — everyone is active.'}
          </p>
        </div>
        <div className="relative flex shrink-0 items-center gap-3">
          <span className="hidden text-xs font-medium text-slate-400 sm:block">{TODAY_LABEL}</span>
          {capabilities.canCreateEmployee && (
            <button
              type="button"
              onClick={() => navigate('/employees?add=1')}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(79,70,229,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-4px_rgba(79,70,229,0.55)] motion-reduce:hover:translate-y-0"
            >
              <PlusCircle className="h-4 w-4" />
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Workforce KPI zone */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Workforce"
          value={employees.length}
          helperText="Across all departments"
          icon={Users}
          accent="indigo"
        />
        <KpiCard
          label="Active Workforce"
          value={activeCount}
          helperText={`${employees.length === 0 ? 0 : Math.round((activeCount / employees.length) * 100)}% of workforce`}
          icon={UserCheck}
          accent="emerald"
        />
        <KpiCard
          label="Departments"
          value={departmentCount}
          helperText="Represented in your team"
          icon={Building2}
          accent="slate"
        />
        <KpiCard
          label="New Joiners"
          value={newJoinerCount}
          helperText={`In the last ${NEW_JOINER_WINDOW_DAYS} days`}
          icon={UserPlus}
          accent="sky"
        />
      </div>

      {/* Workforce Health + Department Intelligence -- asymmetric: the
          department breakdown gets the larger share since it holds one row
          per department and needs the room to stay readable. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <WorkforcePulse active={activeCount} onLeave={onLeaveCount} inactive={inactiveCount} total={employees.length} />
        </div>
        <div className="lg:col-span-3">
          <DepartmentIntelligence breakdown={departmentBreakdown} total={employees.length} />
        </div>
      </div>

      {/* Employee Spotlight + Company Updates */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">{spotlightEmployee && <EmployeeSpotlight employee={spotlightEmployee} />}</div>
        <div className="lg:col-span-3">
          <CompanyUpdatesCard announcements={announcements} canManageAnnouncements={capabilities.canManageAnnouncements} />
        </div>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/70 text-indigo-600 ring-1 ring-indigo-100">
                <History className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Recent Activity</h3>
                <p className="text-xs text-slate-400">Latest changes across your workforce</p>
              </div>
            </div>
            {capabilities.canViewActivity && recentActivity.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/activity')}
                className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                View all
              </button>
            )}
          </div>

          <div className="mt-4">
            {recentActivity.length === 0 ? (
              <EmptyState icon={History} title="No activity yet" description="Updates to your team will appear here automatically." />
            ) : (
              <ul>
                {recentActivity.map((entry, index) => (
                  <ActivityLogEntry key={entry.id} entry={entry} isLast={index === recentActivity.length - 1} />
                ))}
              </ul>
            )}
          </div>
        </div>

        <QuickActions
          canCreateEmployee={capabilities.canCreateEmployee}
          canManageDepartments={capabilities.canManageDepartments}
          canManageRoles={capabilities.canManageRoles}
          onAddEmployee={() => navigate('/employees?add=1')}
          onViewEmployees={() => navigate('/employees')}
          onViewDepartments={() => navigate('/departments')}
          onViewUsers={() => navigate('/users')}
          onViewActivity={() => navigate('/activity')}
          onViewInsights={() => navigate('/insights')}
        />
      </div>
    </div>
  )
}

export default OverviewPage
