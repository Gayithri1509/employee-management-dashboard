interface DashboardSummaryProps {
  totalEmployees: number
  activeCount: number
  departmentCount: number
}

// Presentational only: Dashboard computes the real counts from its
// employees state and passes them down as typed props, so this component
// never manages employee data itself.
function DashboardSummary({ totalEmployees, activeCount, departmentCount }: DashboardSummaryProps) {
  const stats = [
    { label: 'Total Employees', value: totalEmployees },
    { label: 'Active', value: activeCount },
    { label: 'Departments', value: departmentCount },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm"
        >
          <div className="text-2xl font-semibold text-slate-800">{stat.value}</div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {stat.label}
          </div>
        </div>
      ))}
    </section>
  )
}

export default DashboardSummary
