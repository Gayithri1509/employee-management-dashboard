import { useEffect, useRef, useState } from 'react'
import { Link2 } from 'lucide-react'
import type { LinkableProfile } from '../services/supabase/employeeLinking'

interface LinkEmployeeDialogProps {
  employeeName: string
  profiles: LinkableProfile[]
  loading: boolean
  busy: boolean
  error: string | null
  onConfirm: (profileId: string) => void
  onCancel: () => void
}

/**
 * Admin/HR-Manager-only "Link Account" picker. Never matches by email
 * automatically -- the operator explicitly selects one profile from a list
 * of accounts not yet linked to any employee (see list_linkable_profiles,
 * migration 0019). Authorization and every uniqueness rule are enforced by
 * link_employee_profile itself; this dialog is UX only.
 */
function LinkEmployeeDialog({ employeeName, profiles, loading, busy, error, onConfirm, onCancel }: LinkEmployeeDialogProps) {
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const selectRef = useRef<HTMLSelectElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!loading) {
      ;(selectRef.current ?? cancelButtonRef.current)?.focus()
    }
  }, [loading])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out] motion-reduce:animate-none">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="link-employee-heading"
        aria-describedby="link-employee-description"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-[modalIn_0.2s_ease-out] motion-reduce:animate-none"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50">
            <Link2 className="h-5 w-5 text-indigo-600" />
          </span>
          <div className="min-w-0">
            <h2 id="link-employee-heading" className="text-sm font-semibold text-slate-800">
              Link account for {employeeName}
            </h2>
            <p id="link-employee-description" className="mt-1 text-xs text-slate-500">
              Choose the user account this employee should use for self-service sign-in.
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="mt-4">
          {loading ? (
            <p className="text-xs text-slate-400">Loading accounts…</p>
          ) : profiles.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Every account is already linked to an employee. Ask the person to sign up first, or unlink another
              employee's account before linking it here.
            </p>
          ) : (
            <>
              <label htmlFor="link-employee-select" className="mb-1 block text-xs font-medium text-slate-600">
                Account
              </label>
              <select
                id="link-employee-select"
                ref={selectRef}
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                disabled={busy}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="" disabled>
                  Select an account…
                </option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.fullName ? `${profile.fullName} (${profile.email})` : profile.email}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => selectedProfileId && onConfirm(selectedProfileId)}
            disabled={busy || loading || profiles.length === 0 || !selectedProfileId}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Linking…' : 'Link Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LinkEmployeeDialog
