import { useEffect, useRef, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import type { UserRole } from '../types/database'
import { formatRoleLabel } from '../utils/formatting'

const ROLES: UserRole[] = ['employee', 'hr_staff', 'hr_manager', 'admin']

interface ChangeRoleDialogProps {
  userName: string
  userEmail: string
  currentRole: UserRole
  busy: boolean
  error: string | null
  onConfirm: (role: UserRole) => void
  onCancel: () => void
}

/** Admin-only role-change confirmation. The actual authorization and every safety check (self-change, last-admin) are enforced server-side by set_user_role -- this dialog is UX only. */
function ChangeRoleDialog({ userName, userEmail, currentRole, busy, error, onConfirm, onCancel }: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    selectRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onCancel])

  const unchanged = selectedRole === currentRole

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out] motion-reduce:animate-none">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="change-role-heading"
        aria-describedby="change-role-description"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-[modalIn_0.2s_ease-out] motion-reduce:animate-none"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50">
            <ShieldAlert className="h-5 w-5 text-indigo-600" />
          </span>
          <div className="min-w-0">
            <h2 id="change-role-heading" className="text-sm font-semibold text-slate-800">
              Change role for {userName}
            </h2>
            <p id="change-role-description" className="mt-1 text-xs text-slate-500">
              {userEmail} &middot; currently {formatRoleLabel(currentRole)}
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="mt-4">
          <label htmlFor="change-role-select" className="mb-1 block text-xs font-medium text-slate-600">
            New role
          </label>
          <select
            id="change-role-select"
            ref={selectRef}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            disabled={busy}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {formatRoleLabel(role)}
              </option>
            ))}
          </select>
        </div>

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
            onClick={() => onConfirm(selectedRole)}
            disabled={busy || unchanged}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Change Role'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangeRoleDialog
