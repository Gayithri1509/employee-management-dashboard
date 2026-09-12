interface DepartmentBreakdownItem {
  department: string
  count: number
}

interface DepartmentIntelligenceProps {
  breakdown: DepartmentBreakdownItem[]
  total: number
}

function DepartmentIntelligence({ breakdown, total }: DepartmentIntelligenceProps) {
  const maxCount = Math.max(...breakdown.map((item) => item.count), 1)

  return (
    <div className="h-full rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">Department Intelligence</h3>
      <p className="mt-0.5 text-xs text-slate-400">Headcount distribution across {breakdown.length} departments</p>

      <ul className="mt-4 space-y-3">
        {breakdown.map((item) => (
          <li key={item.department}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{item.department}</span>
              <span className="text-slate-400">
                {item.count} {item.count === 1 ? 'person' : 'people'}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">{total} employees total</p>
    </div>
  )
}

export default DepartmentIntelligence
