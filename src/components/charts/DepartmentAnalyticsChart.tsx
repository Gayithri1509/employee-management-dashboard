export interface DepartmentDatum {
  name: string
  total: number
  active: number
}

interface DepartmentAnalyticsChartProps {
  data: DepartmentDatum[]
  onSelect?: (departmentName: string) => void
}

/**
 * A ranked, clickable bar list of departments by total headcount -- sorted
 * descending by the caller so the largest department is visually obvious.
 * Each row shows total + active counts and, when onSelect is provided,
 * behaves as a real button that hands the department name back to the
 * caller (used to deep-link into Employees pre-filtered by department).
 */
function DepartmentAnalyticsChart({ data, onSelect }: DepartmentAnalyticsChartProps) {
  const maxValue = Math.max(...data.map((dept) => dept.total), 1)

  return (
    <ul className="space-y-2.5">
      {data.map((dept) => {
        const content = (
          <>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-slate-700 group-hover:text-indigo-700">{dept.name}</span>
              <span className="shrink-0 whitespace-nowrap text-slate-400">
                <span className="font-medium text-slate-600">{dept.total}</span> total &middot; {dept.active} active
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out group-hover:bg-indigo-600"
                style={{ width: `${(dept.total / maxValue) * 100}%` }}
              />
            </div>
          </>
        )

        return (
          <li key={dept.name}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(dept.name)}
                className="group -mx-2 w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                title={`View ${dept.name} employees`}
              >
                {content}
              </button>
            ) : (
              <div className="group px-0 py-1.5">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default DepartmentAnalyticsChart
