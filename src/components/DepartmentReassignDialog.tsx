import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface DepartmentOption {
  id: string
  name: string
}

interface DepartmentReassignDialogProps {
  departmentName: string
  employeeCount: number
  otherDepartments: DepartmentOption[]
  busy: boolean
  onConfirm: (targetDepartmentId: string) => void
  onCancel: () => void
}

/**
 * Shown instead of a plain delete confirmation when a department still has
 * employees -- deleting is blocked (both by the UI and, as a hard backstop,
 * by the employees.department_id foreign key) until every employee is moved
 * somewhere else first.
 */
function DepartmentReassignDialog({
  departmentName,
  employeeCount,
  otherDepartments,
  busy,
  onConfirm,
  onCancel,
}: DepartmentReassignDialogProps) {
  const [targetId, setTargetId] = useState(otherDepartments[0]?.id ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out] motion-reduce:animate-none">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reassign-heading"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-[modalIn_0.2s_ease-out] motion-reduce:animate-none"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </span>
          <div className="min-w-0">
            <h2 id="reassign-heading" className="text-sm font-semibold text-slate-800">
              {departmentName} still has {employeeCount} {employeeCount === 1 ? 'employee' : 'employees'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Move everyone in {departmentName} to another department before it can be deleted.
            </p>
          </div>
        </div>

        {otherDepartments.length === 0 ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            There's no other department to move these employees to. Create another department first.
          </p>
        ) : (
          <div className="mt-4">
            <label htmlFor="reassign-target" className="mb-1 block text-xs font-medium text-slate-600">
              Move employees to
            </label>
            <select
              id="reassign-target"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              disabled={busy}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {otherDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => targetId && onConfirm(targetId)}
            disabled={busy || otherDepartments.length === 0}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Working…' : 'Move & Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DepartmentReassignDialog
