interface WorkforcePulseProps {
  active: number
  onLeave: number
  inactive: number
  total: number
}

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100)
}

function WorkforcePulse({ active, onLeave, inactive, total }: WorkforcePulseProps) {
  const segments = [
    { label: 'Active', value: active, color: 'bg-emerald-500' },
    { label: 'On Leave', value: onLeave, color: 'bg-amber-500' },
    { label: 'Inactive', value: inactive, color: 'bg-slate-300' },
  ]

  return (
    <div className="h-full rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">Workforce Pulse</h3>
      <p className="mt-0.5 text-xs text-slate-400">Live status distribution across your team</p>

      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={`h-full ${segment.color} transition-all duration-500 ease-out`}
            style={{ width: `${pct(segment.value, total)}%` }}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-slate-600">
              <span className={`h-2 w-2 rounded-full ${segment.color}`} />
              {segment.label}
            </span>
            <span className="font-medium text-slate-700">
              {segment.value} <span className="text-slate-400">({pct(segment.value, total)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default WorkforcePulse
