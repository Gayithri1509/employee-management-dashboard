import type { ComponentType } from 'react'

type KpiAccent = 'indigo' | 'emerald' | 'amber' | 'slate'

interface KpiCardProps {
  label: string
  value: number
  helperText: string
  icon: ComponentType<{ className?: string }>
  accent: KpiAccent
}

const ACCENT_STYLES: Record<KpiAccent, { wrap: string; icon: string }> = {
  indigo: { wrap: 'bg-indigo-50', icon: 'text-indigo-600' },
  emerald: { wrap: 'bg-emerald-50', icon: 'text-emerald-600' },
  amber: { wrap: 'bg-amber-50', icon: 'text-amber-600' },
  slate: { wrap: 'bg-slate-100', icon: 'text-slate-600' },
}

function KpiCard({ label, value, helperText, icon: Icon, accent }: KpiCardProps) {
  const styles = ACCENT_STYLES[accent]
  return (
    <div className="group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 animate-[fadeIn_0.4s_ease-out] text-3xl font-semibold tabular-nums text-slate-900">
            {value}
          </p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.wrap}`}>
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{helperText}</p>
    </div>
  )
}

export default KpiCard
