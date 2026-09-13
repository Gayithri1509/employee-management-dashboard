import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
}

function LoadingState({ message = 'Loading dashboard data…' }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
    >
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" aria-hidden="true" />
      <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>
    </div>
  )
}

export default LoadingState
