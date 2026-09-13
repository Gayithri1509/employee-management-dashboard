export interface BarListItem {
  label: string
  value: number
  sublabel?: string
  colorClass?: string
}

interface HorizontalBarListProps {
  items: BarListItem[]
  valueSuffix?: string
}

/** A ranked-magnitude bar list -- the correct form for "which of these N things is biggest," per a single hue varying by length rather than N categorical colors. */
function HorizontalBarList({ items, valueSuffix = '' }: HorizontalBarListProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium text-slate-700">{item.label}</span>
            <span className="shrink-0 whitespace-nowrap text-slate-400">
              {item.value}
              {valueSuffix}
              {item.sublabel && <span className="text-slate-300"> &middot; {item.sublabel}</span>}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${item.colorClass ?? 'bg-indigo-500'}`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default HorizontalBarList
