import { useState } from 'react'

export interface TrendPoint {
  label: string
  value: number
}

interface JoiningTrendChartProps {
  data: TrendPoint[]
}

/**
 * A vertical bar chart of joins-per-year -- the correct form for a
 * change-over-time count, with a hover/focus tooltip per bar (per the
 * project's dataviz convention that interactive charts ship a hover layer by
 * default). Plain divs, no charting library.
 */
function JoiningTrendChart({ data }: JoiningTrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const maxValue = Math.max(...data.map((point) => point.value), 1)

  return (
    <div>
      <div
        className="flex h-48 items-end gap-1.5 border-b border-slate-100 sm:gap-2.5"
        role="img"
        aria-label={`Employees joined by year: ${data.map((d) => `${d.label}, ${d.value}`).join('; ')}`}
      >
        {data.map((point, index) => {
          const heightPct = (point.value / maxValue) * 100
          const isActive = activeIndex === index
          return (
            <div
              key={point.label}
              className="group relative flex h-full flex-1 flex-col items-center justify-end outline-none"
              tabIndex={0}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            >
              {isActive && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute -top-9 z-10 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
                >
                  {point.value} {point.value === 1 ? 'join' : 'joins'} &middot; {point.label}
                </div>
              )}
              <div
                className={`w-full max-w-[36px] rounded-t-md transition-all duration-300 ease-out ${
                  isActive ? 'bg-indigo-600' : 'bg-indigo-500 group-hover:bg-indigo-600'
                }`}
                style={{ height: point.value === 0 ? '2px' : `${Math.max(heightPct, 3)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2.5">
        {data.map((point) => (
          <span key={point.label} className="flex-1 truncate text-center text-[11px] text-slate-400">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default JoiningTrendChart
