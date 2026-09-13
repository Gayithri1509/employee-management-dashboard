import { AlertTriangle, Building2, Sparkles, TrendingUp, UserCheck, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppOutletContext } from '../layouts/appOutletContext'
import KpiCard from '../components/kpi/KpiCard'
import StatusDonut from '../components/charts/StatusDonut'
import JoiningTrendChart from '../components/charts/JoiningTrendChart'
import DepartmentAnalyticsChart from '../components/charts/DepartmentAnalyticsChart'
import TenureHistogram from '../components/charts/TenureHistogram'
import InsightCard from '../components/InsightCard'
import InsightsSkeleton from '../components/InsightsSkeleton'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const RECENT_JOIN_WINDOW_DAYS = 365

/** Real, computed tenure in years (fractional) from a joining date to now -- used only to average across the workforce, never shown per-employee here. */
function tenureYears(isoJoiningDate: string): number | null {
  const joined = new Date(isoJoiningDate)
  if (Number.isNaN(joined.getTime())) return null
  return (Date.now() - joined.getTime()) / (MS_PER_DAY * 365.25)
}

function InsightsPage() {
  const { employees, departments, loading, employeesError, departmentsError, retryAll } = useAppOutletContext()
  const navigate = useNavigate()

  if (loading) {
    return <InsightsSkeleton />
  }

  if (employeesError || departmentsError) {
    return (
      <ErrorState
        message={employeesError ?? departmentsError ?? 'Something went wrong while loading insights.'}
        onRetry={retryAll}
      />
    )
  }

  if (employees.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No insights yet"
        description="Insights appear once employees have been added to the organization."
      />
    )
  }

  const total = employees.length
  const activeCount = employees.filter((e) => e.status === 'Active').length
  const onLeaveCount = employees.filter((e) => e.status === 'On Leave').length
  const inactiveCount = employees.filter((e) => e.status === 'Inactive').length
  const attentionCount = onLeaveCount + inactiveCount

  const departmentStats = departments
    .map((dept) => {
      const deptEmployees = employees.filter((e) => e.department === dept.name)
      return {
        name: dept.name,
        total: deptEmployees.length,
        active: deptEmployees.filter((e) => e.status === 'Active').length,
        onLeave: deptEmployees.filter((e) => e.status === 'On Leave').length,
        inactive: deptEmployees.filter((e) => e.status === 'Inactive').length,
      }
    })
    .sort((a, b) => b.total - a.total)

  const largestDepartment = departmentStats[0]

  const tenures = employees.map((e) => tenureYears(e.joiningDate)).filter((years): years is number => years !== null)
  const averageTenureYears = tenures.length === 0 ? 0 : tenures.reduce((sum, years) => sum + years, 0) / tenures.length

  const recentJoinCount = employees.filter((e) => {
    const joined = new Date(e.joiningDate)
    if (Number.isNaN(joined.getTime())) return false
    return (Date.now() - joined.getTime()) / MS_PER_DAY <= RECENT_JOIN_WINDOW_DAYS
  }).length

  const tenureBuckets = [
    { label: '< 1 year', min: 0, max: 1 },
    { label: '1–3 years', min: 1, max: 3 },
    { label: '3–5 years', min: 3, max: 5 },
    { label: '5+ years', min: 5, max: Infinity },
  ].map((bucket) => ({
    label: bucket.label,
    value: tenures.filter((years) => years >= bucket.min && years < bucket.max).length,
  }))

  const joinsByYear = new Map<number, number>()
  for (const employee of employees) {
    const joined = new Date(employee.joiningDate)
    if (Number.isNaN(joined.getTime())) continue
    const year = joined.getFullYear()
    joinsByYear.set(year, (joinsByYear.get(year) ?? 0) + 1)
  }
  const joiningTrend = Array.from(joinsByYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ label: String(year), value: count }))

  const departmentsWithAttention = departmentStats.filter((d) => d.onLeave + d.inactive > 0)
  const highestOnLeaveDept = [...departmentStats].sort((a, b) => b.onLeave - a.onLeave)[0]
  const highestInactiveDept = [...departmentStats].sort((a, b) => b.inactive - a.inactive)[0]

  const largestTenureBucket = [...tenureBuckets].sort((a, b) => b.value - a.value)[0]

  const observations = [
    largestDepartment && {
      icon: Building2,
      accent: 'indigo' as const,
      title: 'Largest department',
      description: `${largestDepartment.name} leads with ${largestDepartment.total} ${largestDepartment.total === 1 ? 'person' : 'people'} (${total === 0 ? 0 : Math.round((largestDepartment.total / total) * 100)}% of the workforce).`,
    },
    {
      icon: TrendingUp,
      accent: 'emerald' as const,
      title: 'Recent hiring',
      description: `${recentJoinCount} ${recentJoinCount === 1 ? 'person has' : 'people have'} joined in the last 12 months (${total === 0 ? 0 : Math.round((recentJoinCount / total) * 100)}% of the current workforce).`,
    },
    attentionCount > 0 && {
      icon: AlertTriangle,
      accent: 'amber' as const,
      title: 'Needs follow-up',
      description: `${attentionCount} ${attentionCount === 1 ? 'employee is' : 'employees are'} on leave or inactive and may need attention.`,
    },
    largestTenureBucket &&
      largestTenureBucket.value > 0 && {
        icon: Users,
        accent: 'slate' as const,
        title: 'Tenure profile',
        description: `Most of the workforce (${largestTenureBucket.value} ${largestTenureBucket.value === 1 ? 'person' : 'people'}) falls in the ${largestTenureBucket.label} tenure bucket.`,
      },
  ].filter((observation): observation is { icon: typeof Building2; accent: 'indigo' | 'emerald' | 'amber' | 'slate'; title: string; description: string } => Boolean(observation))

  function goToDepartment(departmentName: string) {
    navigate(`/employees?department=${encodeURIComponent(departmentName)}`)
  }

  return (
    <div className="scroll-mt-20 space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-slate-500">Workforce intelligence, computed from your current data.</p>
        <p className="text-xs text-slate-400">
          As of{' '}
          {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Executive Workforce Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Workforce" value={total} helperText="All employee records" icon={Users} accent="indigo" />
        <KpiCard
          label="Active Workforce"
          value={activeCount}
          helperText={`${total === 0 ? 0 : Math.round((activeCount / total) * 100)}% of total workforce`}
          icon={UserCheck}
          accent="emerald"
        />
        <KpiCard
          label="Workforce Attention"
          value={attentionCount}
          helperText="On leave or inactive"
          icon={AlertTriangle}
          accent="amber"
        />
        <KpiCard
          label="Average Tenure"
          value={Math.round(averageTenureYears * 10) / 10}
          helperText="Years, across all employees"
          icon={TrendingUp}
          accent="sky"
        />
      </div>

      {/* Workforce Status + Joining Trend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md ring-1 ring-slate-900/[0.04] transition-shadow duration-200 hover:shadow-lg lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800">Workforce Status</h2>
          <p className="mt-0.5 text-xs text-slate-400">Where your workforce stands right now</p>
          <div className="mt-5">
            <StatusDonut active={activeCount} onLeave={onLeaveCount} inactive={inactiveCount} total={total} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm lg:col-span-3">
          <h2 className="text-sm font-semibold text-slate-800">Employee Joining Trend</h2>
          <p className="mt-0.5 text-xs text-slate-400">Employees joined, by year</p>
          <div className="mt-5">
            {joiningTrend.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No joining dates on record yet.</p>
            ) : (
              <JoiningTrendChart data={joiningTrend} />
            )}
          </div>
        </div>
      </div>

      {/* Department Analytics */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md ring-1 ring-slate-900/[0.04] transition-shadow duration-200 hover:shadow-lg">
        <h2 className="text-sm font-semibold text-slate-800">Department Workforce</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Headcount by department, sorted by size &mdash; select a department to view its employees
        </p>
        <div className="mt-5">
          {departmentStats.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No departments yet.</p>
          ) : (
            <DepartmentAnalyticsChart data={departmentStats} onSelect={goToDepartment} />
          )}
        </div>
      </div>

      {/* Tenure Analytics + Workforce Health/Attention */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Workforce Tenure</h2>
          <p className="mt-0.5 text-xs text-slate-400">How long your workforce has been with you</p>
          <div className="mt-5">
            <TenureHistogram buckets={tenureBuckets} />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/30 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Workforce Attention</h2>
              <p className="text-xs text-slate-400">Employees who may need follow-up</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">On Leave</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{onLeaveCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Inactive</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{inactiveCount}</p>
            </div>
          </div>

          {departmentsWithAttention.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-amber-200/60 pt-4 text-xs text-slate-600">
              {highestOnLeaveDept && highestOnLeaveDept.onLeave > 0 && (
                <p>
                  <span className="font-medium text-slate-700">{highestOnLeaveDept.name}</span> has the most people on
                  leave ({highestOnLeaveDept.onLeave}).
                </p>
              )}
              {highestInactiveDept && highestInactiveDept.inactive > 0 && (
                <p>
                  <span className="font-medium text-slate-700">{highestInactiveDept.name}</span> has the most inactive
                  employees ({highestInactiveDept.inactive}).
                </p>
              )}
            </div>
          )}

          {attentionCount === 0 && (
            <p className="mt-4 border-t border-amber-200/60 pt-4 text-xs text-slate-500">
              Every employee is currently active. No follow-up needed.
            </p>
          )}
        </div>
      </div>

      {/* Data-Driven Observations */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Data-Driven Observations</h2>
            <p className="text-xs text-slate-400">Plain-language summary of the data above</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {observations.map((observation) => (
            <InsightCard
              key={observation.title}
              icon={observation.icon}
              title={observation.title}
              description={observation.description}
              accent={observation.accent}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default InsightsPage
