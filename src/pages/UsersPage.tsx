import { useCallback, useEffect, useState } from 'react'
import { ShieldAlert, Users as UsersIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAppOutletContext } from '../layouts/appOutletContext'
import { fetchUsersForAdmin, setUserRole, type AdminUser } from '../services/supabase/users'
import type { UserRole } from '../types/database'
import { formatDateTime, getInitials } from '../utils/formatting'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import RoleBadge from '../components/RoleBadge'
import ChangeRoleDialog from '../components/ChangeRoleDialog'

function UsersPage() {
  const { user } = useAuth()
  const { showToast, refreshAll } = useAppOutletContext()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [changeTarget, setChangeTarget] = useState<AdminUser | null>(null)
  const [dialogBusy, setDialogBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    const result = await fetchUsersForAdmin()

    if (result.data) {
      setUsers(result.data)
      setError(null)
    } else {
      setUsers([])
      setError(result.error ?? 'Failed to load users.')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  function retry() {
    setLoading(true)
    void loadUsers()
  }

  async function handleConfirmRoleChange(role: UserRole) {
    if (!changeTarget) return
    setDialogBusy(true)
    setDialogError(null)

    const result = await setUserRole(changeTarget.id, role)
    setDialogBusy(false)

    if (result.error) {
      setDialogError(result.error)
      return
    }

    setChangeTarget(null)
    showToast(`${changeTarget.fullName ?? changeTarget.email} is now ${role === 'admin' ? 'an' : 'a'} ${role.replace('_', ' ')}.`)
    void loadUsers()
    // A role change writes a new activity_logs row (0018) -- refresh the
    // shared org-data activity feed too, so Activity/Overview show it
    // immediately instead of only after the next full app load.
    void refreshAll()
  }

  if (loading) {
    return <LoadingState message="Loading users…" />
  }

  if (error) {
    return <ErrorState message={error} onRetry={retry} />
  }

  return (
    <div className="scroll-mt-20 space-y-6">
      <div>
        <p className="text-sm text-slate-500">Manage who has access and what role each person has.</p>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users yet" description="Signed-up accounts will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-md ring-1 ring-slate-900/[0.04]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Last sign-in</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((appUser) => {
                const isSelf = appUser.id === user?.id
                return (
                  <tr key={appUser.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                          {getInitials(appUser.fullName ?? appUser.email) || '?'}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{appUser.fullName ?? '—'}</p>
                          <p className="truncate text-xs text-slate-500">{appUser.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <RoleBadge role={appUser.role} />
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {appUser.lastSignInAt ? formatDateTime(appUser.lastSignInAt) : 'Never signed in'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setDialogError(null)
                          setChangeTarget(appUser)
                        }}
                        disabled={isSelf}
                        title={isSelf ? "You can't change your own role." : undefined}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-600"
                      >
                        Change Role
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        You can't change your own role, and the last remaining Admin can't be demoted -- both are enforced by the
        database, not just this page.
      </div>

      {changeTarget && (
        <ChangeRoleDialog
          userName={changeTarget.fullName ?? changeTarget.email}
          userEmail={changeTarget.email}
          currentRole={changeTarget.role}
          busy={dialogBusy}
          error={dialogError}
          onConfirm={(role) => void handleConfirmRoleChange(role)}
          onCancel={() => setChangeTarget(null)}
        />
      )}
    </div>
  )
}

export default UsersPage
