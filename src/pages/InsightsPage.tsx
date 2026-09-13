import { Building2, Calendar, Sparkles, TrendingUp } from 'lucide-react'
import { useAppOutletContext } from '../layouts/appOutletContext'
import KpiCard from '../components/kpi/KpiCard'
import HorizontalBarList from '../components/charts/HorizontalBarList'
import LoadingState from '../components/LoadingState'
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

  if (loading) {
    return <LoadingState message="Loading workforce insights…" />
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

  const departmentCounts = departments
    .map((dept) => ({
      name: dept.name,
      count: employees.filter((e) => e.department === dept.name).length,
      active: employees.filter((e) => e.department === dept.name && e.status === 'Active').length,
    }))
    .sort((a, b) => b.count - a.count)

  const largestDepartment = departmentCounts[0]

  const tenures = employees.map((e) => tenureYears(e.joiningDate)).filter((years): years is number => years !== null)
  const averageTenureYears = tenures.length === 0 ? 0 : tenures.reduce((sum, years) => sum + years, 0) / tenures.length

  const recentJoinCount = employees.filter((e) => {
    const joined = new Date(e.joiningDate)
    if (Number.isNaN(joined.getTime())) return false
    return (Date.now() - joined.getTime()) / MS_PER_DAY <= RECENT_JOIN_WINDOW_DAYS
  }).length

  const tenureBuckets = [
    { label: 'Less than 1 year', min: 0, max: 1 },
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
  const joiningPattern = Array.from(joinsByYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ label: String(year), value: count }))

  const needsAttentionCount = onLeaveCount + inactiveCount

  const observations = [
    largestDepartment &&
      `${largestDepartment.name} is your largest department, with ${largestDepartment.count} ${largestDepartment.count === 1 ? 'person' : 'people'} (${Math.round((largestDepartment.count / total) * 100)}% of the workforce).`,
    `${recentJoinCount} ${recentJoinCount === 1 ? 'person has' : 'people have'} joined in the last 12 months (${Math.round((recentJoinCount / total) * 100)}% of the current workforce).`,
    needsAttentionCount > 0
      ? `${needsAttentionCount} ${needsAttentionCount === 1 ? 'employee is' : 'employees are'} currently on leave or inactive and may need follow-up.`
      : 'Every employee is currently active.',
  ].filter((observation): observation is string => Boolean(observation))

  return (
    <div className="scroll-mt-20 space-y-6">
      <div>
        <p className="text-sm text-slate-500">Real workforce analytics, computed from your current data.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Largest Department"
          value={largestDepartment?.count ?? 0}
          helperText={largestDepartment?.name ?? 'No departments yet'}
          icon={Building2}
          accent="indigo"
        />
        <KpiCard
          label="Average Tenure"
          value={Math.round(averageTenureYears * 10) / 10}
          helperText="Years, across all employees"
          icon={TrendingUp}
          accent="emerald"
        />
        <KpiCard
          label="Joined Last 12 Months"
          value={recentJoinCount}
          helperText={`${total === 0 ? 0 : Math.round((recentJoinCount / total) * 100)}% of current workforce`}
          icon={Calendar}
          accent="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Status Distribution</h2>
          <p className="mt-0.5 text-xs text-slate-400">Where your workforce stands right now</p>
          <div className="mt-4">
            <HorizontalBarList
              items={[
                { label: 'Active', value: activeCount, colorClass: 'bg-emerald-500' },
                { label: 'On Leave', value: onLeaveCount, colorClass: 'bg-amber-500' },
                { label: 'Inactive', value: inactiveCount, colorClass: 'bg-slate-400' },
              ]}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Tenure Distribution</h2>
          <p className="mt-0.5 text-xs text-slate-400">How long your workforce has been with you</p>
          <div className="mt-4">
            <HorizontalBarList items={tenureBuckets} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Joining Pattern</h2>
          <p className="mt-0.5 text-xs text-slate-400">Employees joined, by year</p>
          <div className="mt-4">
            <HorizontalBarList items={joiningPattern} />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <div className="p-5 pb-0">
            <h2 className="text-sm font-semibold text-slate-800">Department Breakdown</h2>
            <p className="mt-0.5 text-xs text-slate-400">Headcount and active count per department</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Department</th>
                  <th className="px-5 py-2.5 font-medium text-right">Total</th>
                  <th className="px-5 py-2.5 font-medium text-right">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentCounts.map((dept) => (
                  <tr key={dept.name}>
                    <td className="truncate px-5 py-2.5 font-medium text-slate-700">{dept.name}</td>
                    <td className="px-5 py-2.5 text-right text-slate-500">{dept.count}</td>
                    <td className="px-5 py-2.5 text-right text-slate-500">{dept.active}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Observations</h2>
            <p className="text-xs text-slate-400">Plain-language summary of the data above</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {observations.map((observation) => (
            <li key={observation} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              {observation}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default InsightsPage
