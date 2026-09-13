import type { ComponentType } from 'react'

type KpiAccent = 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose' | 'sky'

interface KpiCardProps {
  label: string
  value: number
  helperText: string
  icon: ComponentType<{ className?: string }>
  accent: KpiAccent
}

const ACCENT_STYLES: Record<KpiAccent, { wrap: string; icon: string; bar: string }> = {
  indigo: { wrap: 'bg-gradient-to-br from-indigo-50 to-indigo-100/70 ring-1 ring-indigo-100', icon: 'text-indigo-600', bar: 'bg-indigo-500' },
  emerald: { wrap: 'bg-gradient-to-br from-emerald-50 to-emerald-100/70 ring-1 ring-emerald-100', icon: 'text-emerald-600', bar: 'bg-emerald-500' },
  amber: { wrap: 'bg-gradient-to-br from-amber-50 to-amber-100/70 ring-1 ring-amber-100', icon: 'text-amber-600', bar: 'bg-amber-500' },
  slate: { wrap: 'bg-gradient-to-br from-slate-100 to-slate-200/70 ring-1 ring-slate-200', icon: 'text-slate-600', bar: 'bg-slate-400' },
  rose: { wrap: 'bg-gradient-to-br from-rose-50 to-rose-100/70 ring-1 ring-rose-100', icon: 'text-rose-600', bar: 'bg-rose-500' },
  sky: { wrap: 'bg-gradient-to-br from-sky-50 to-sky-100/70 ring-1 ring-sky-100', icon: 'text-sky-600', bar: 'bg-sky-500' },
}

/**
 * A "floating" KPI tile -- the accent bar and gradient icon chip give each
 * card a distinct identity at a glance (per-metric, not per-page), and the
 * surface itself lifts and deepens its shadow on hover (surface-floating,
 * defined once in index.css) rather than every card sharing one flat
 * treatment.
 */
function KpiCard({ label, value, helperText, icon: Icon, accent }: KpiCardProps) {
  const styles = ACCENT_STYLES[accent]
  return (
    <div className="surface-floating group overflow-hidden p-5">
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-[3px] ${styles.bar}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 animate-[fadeIn_0.4s_ease-out] text-[32px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
            {value}
          </p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.wrap}`}>
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </span>
      </div>
      <p className="mt-3 text-[13px] text-slate-500">{helperText}</p>
    </div>
  )
}

export default KpiCard
