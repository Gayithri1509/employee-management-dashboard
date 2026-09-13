interface StatusDonutProps {
  active: number
  onLeave: number
  inactive: number
  total: number
}

const SIZE = 132
const STROKE = 16
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface Segment {
  label: string
  value: number
  colorClass: string
}

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100)
}

/**
 * A part-of-whole status donut (Active/On Leave/Inactive), built from plain
 * SVG stroked arcs -- no charting library needed at this data scale. Colors
 * match StatusBadge exactly (emerald/amber/slate) so status meaning stays
 * consistent everywhere it appears in the product, per the dataviz
 * convention that status color is reserved and never reassigned.
 */
function StatusDonut({ active, onLeave, inactive, total }: StatusDonutProps) {
  const segments: Segment[] = [
    { label: 'Active', value: active, colorClass: 'text-emerald-500' },
    { label: 'On Leave', value: onLeave, colorClass: 'text-amber-500' },
    { label: 'Inactive', value: inactive, colorClass: 'text-slate-300' },
  ]

  let offset = 0

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          role="img"
          aria-label={`Workforce status: ${active} active, ${onLeave} on leave, ${inactive} inactive, out of ${total} total`}
        >
          {total === 0 ? (
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-slate-100" />
          ) : (
            segments.map((segment) => {
              const fraction = segment.value / total
              const dash = fraction * CIRCUMFERENCE
              const gap = CIRCUMFERENCE - dash
              const strokeDashoffset = -offset
              offset += dash
              if (segment.value === 0) return null
              return (
                <circle
                  key={segment.label}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={STROKE}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={strokeDashoffset}
                  className={`${segment.colorClass} transition-[stroke-dasharray] duration-500 ease-out`}
                />
              )
            })
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-slate-900">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-400">People</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-slate-600">
              <span className={`h-2 w-2 shrink-0 rounded-full bg-current ${segment.colorClass}`} />
              {segment.label}
            </span>
            <span className="whitespace-nowrap font-medium text-slate-700">
              {segment.value} <span className="text-slate-400">({pct(segment.value, total)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default StatusDonut
