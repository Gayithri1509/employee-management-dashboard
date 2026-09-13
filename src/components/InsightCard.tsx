import type { ComponentType } from 'react'

type InsightAccent = 'indigo' | 'emerald' | 'amber' | 'slate'

interface InsightCardProps {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  accent?: InsightAccent
}

const ACCENT_STYLES: Record<InsightAccent, { wrap: string; icon: string }> = {
  indigo: { wrap: 'bg-indigo-50', icon: 'text-indigo-600' },
  emerald: { wrap: 'bg-emerald-50', icon: 'text-emerald-600' },
  amber: { wrap: 'bg-amber-50', icon: 'text-amber-600' },
  slate: { wrap: 'bg-slate-100', icon: 'text-slate-600' },
}

/** A compact, single-observation card -- icon + short title + one-sentence explanation. Replaces a plain bullet list so each real, calculated observation reads as its own scannable unit. */
function InsightCard({ icon: Icon, title, description, accent = 'indigo' }: InsightCardProps) {
  const styles = ACCENT_STYLES[accent]
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.wrap}`}>
        <Icon className={`h-4 w-4 ${styles.icon}`} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}

export default InsightCard
