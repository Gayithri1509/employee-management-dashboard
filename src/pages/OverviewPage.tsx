import { useNavigate } from 'react-router-dom'
import { Building2, History, UserCheck, UserPlus, Users } from 'lucide-react'
import type { Employee } from '../types/employee'
import { useAuth } from '../contexts/AuthContext'
import { useAppOutletContext } from '../layouts/appOutletContext'
import KpiCard from '../components/kpi/KpiCard'
import WorkforcePulse from '../components/insights/WorkforcePulse'
import DepartmentIntelligence from '../components/insights/DepartmentIntelligence'
import EmployeeSpotlight from '../components/EmployeeSpotlight'
import QuickActions from '../components/QuickActions'
import ActivityLogEntry from '../components/ActivityLogEntry'
import EmptyState from '../components/EmptyState'
import OverviewSkeleton from '../components/OverviewSkeleton'
import ErrorState from '../components/ErrorState'

const NEW_JOINER_WINDOW_DAYS = 30
const MS_PER_DAY = 1000 * 60 * 60 * 24
const RECENT_ACTIVITY_LIMIT = 5

function OverviewPage() {
  const { employees, departments, activityEntries, loading, employeesError, departmentsError, retryAll, capabilities } =
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
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {employees.length} people across {departmentCount} {departmentCount === 1 ? 'department' : 'departments'}
          {onLeaveCount > 0 || inactiveCount > 0
            ? ` — ${activeCount} active, ${onLeaveCount + inactiveCount} need attention.`
            : ' — everyone is active.'}
        </p>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WorkforcePulse active={activeCount} onLeave={onLeaveCount} inactive={inactiveCount} total={employees.length} />
        <DepartmentIntelligence breakdown={departmentBreakdown} total={employees.length} />
        {spotlightEmployee && <EmployeeSpotlight employee={spotlightEmployee} />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
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
