export interface TenureBucket {
  label: string
  value: number
}

interface TenureHistogramProps {
  buckets: TenureBucket[]
}

/** A small vertical histogram for the 4 fixed tenure buckets, with counts shown directly since there are few enough bars for permanent labels to stay readable. */
function TenureHistogram({ buckets }: TenureHistogramProps) {
  const maxValue = Math.max(...buckets.map((bucket) => bucket.value), 1)

  return (
    <div
      className="flex h-40 items-end justify-between gap-3 sm:gap-4"
      role="img"
      aria-label={`Tenure distribution: ${buckets.map((b) => `${b.label}, ${b.value}`).join('; ')}`}
    >
      {buckets.map((bucket) => {
        const heightPct = (bucket.value / maxValue) * 100
        return (
          <div key={bucket.label} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className="mb-1.5 text-xs font-semibold tabular-nums text-slate-700">{bucket.value}</span>
            <div
              className="w-full max-w-[52px] rounded-t-md bg-indigo-500 transition-all duration-500 ease-out"
              style={{ height: bucket.value === 0 ? '2px' : `${Math.max(heightPct, 4)}%` }}
            />
            <span className="mt-2 text-center text-[11px] leading-tight text-slate-400">{bucket.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default TenureHistogram
