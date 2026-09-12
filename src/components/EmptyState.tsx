import type { ComponentType } from 'react'

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-slate-400">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState
