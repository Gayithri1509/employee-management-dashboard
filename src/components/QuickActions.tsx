import { Activity, PlusCircle, Users } from 'lucide-react'

interface QuickActionsProps {
  onViewEmployees: () => void
  onViewActivity: () => void
}

function QuickActions({ onViewEmployees, onViewActivity }: QuickActionsProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">Quick Actions</h3>
      <p className="mt-0.5 text-xs text-slate-400">Jump to what you need</p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Add Employee is coming soon — it will reuse the existing employee model and validation once available."
          className="flex cursor-not-allowed items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-400"
        >
          <span className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Employee
          </span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Soon
          </span>
        </button>

        <button
          type="button"
          onClick={onViewEmployees}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          <Users className="h-4 w-4" />
          View Employees
        </button>

        <button
          type="button"
          onClick={onViewActivity}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          <Activity className="h-4 w-4" />
          View Activity
        </button>
      </div>
    </div>
  )
}

export default QuickActions
