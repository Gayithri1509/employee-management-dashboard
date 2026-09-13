import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50/50 px-6 py-12 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-700">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  )
}

export default ErrorState
