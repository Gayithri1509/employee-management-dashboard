export interface DepartmentBreakdownItem {
  department: string
  count: number
  activeCount: number
}

interface DepartmentIntelligenceProps {
  breakdown: DepartmentBreakdownItem[]
  total: number
}

function DepartmentIntelligence({ breakdown, total }: DepartmentIntelligenceProps) {
  const maxCount = Math.max(...breakdown.map((item) => item.count), 1)

  return (
    <div className="surface-elevated flex h-full flex-col p-6">
      <h3 className="text-[15px] font-semibold text-slate-800">Department Intelligence</h3>
      <p className="mt-0.5 text-xs text-slate-400">Headcount across {breakdown.length} departments</p>

      <ul className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {breakdown.map((item) => (
          <li key={item.department} className="group rounded-lg px-1 py-0.5 transition-colors hover:bg-slate-50">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-slate-700">{item.department}</span>
              <span className="shrink-0 whitespace-nowrap text-slate-400">
                {item.count} {item.count === 1 ? 'person' : 'people'}
                {item.activeCount < item.count && <span className="text-slate-300"> &middot; {item.activeCount} active</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out"
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
