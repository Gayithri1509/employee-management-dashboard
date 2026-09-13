import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <ShieldAlert className="h-7 w-7 text-red-500" />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-slate-800">Access denied</h1>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">
        Your account doesn't have permission to view this page. If you think this is a mistake, contact your
        administrator.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        Go back
      </Link>
    </div>
  )
}

export default AccessDenied
