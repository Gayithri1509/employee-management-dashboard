import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

/**
 * Top-level render-error safety net. React unmounts the whole tree on an
 * uncaught render error with no boundary present, which in production is a
 * blank white screen with no recovery path -- this renders a full-page
 * fallback instead, styled like the existing ErrorState, with a reload
 * button. Never logs the error to a third party; it's a client-only SPA
 * with no error-reporting service configured.
 */
class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled error in EMS UI:', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div
          role="alert"
          className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50/50 px-6 py-10 text-center"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </span>
          <h1 className="mt-4 text-sm font-semibold text-slate-700">Something went wrong</h1>
          <p className="mt-1 text-xs text-slate-500">
            An unexpected error occurred. Reloading the page usually fixes this.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reload
          </button>
        </div>
      </div>
    )
  }
}

export default AppErrorBoundary
