import { useNavigate } from 'react-router-dom'
import { Building2, CalendarClock, UserCheck, Users } from 'lucide-react'
import type { Employee } from '../types/employee'
import { useAppOutletContext } from '../layouts/appOutletContext'
import KpiCard from '../components/kpi/KpiCard'
import WorkforcePulse from '../components/insights/WorkforcePulse'
import DepartmentIntelligence from '../components/insights/DepartmentIntelligence'
import EmployeeSpotlight from '../components/EmployeeSpotlight'
import QuickActions from '../components/QuickActions'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

function OverviewPage() {
  const { employees, departments, loading, employeesError, departmentsError, retryAll, capabilities } =
    useAppOutletContext()
  const navigate = useNavigate()

  if (loading) {
    return <LoadingState message="Loading employees, departments, and activity from Supabase…" />
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

  const activeCount = employees.filter((employee) => employee.status === 'Active').length
  const onLeaveCount = employees.filter((employee) => employee.status === 'On Leave').length
  const inactiveCount = employees.filter((employee) => employee.status === 'Inactive').length
  const departmentCount = departments.length

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
    undefined,
  )

  return (
    <div className="scroll-mt-20 space-y-6">
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
        canCreateEmployee={capabilities.canCreateEmployee}
        onAddEmployee={() => navigate('/employees?add=1')}
        onViewEmployees={() => navigate('/employees')}
        onViewActivity={() => navigate('/activity')}
      />
    </div>
  )
}

export default OverviewPage
