import { useState, type FormEvent } from 'react'
import { LogOut, Mail, Shield, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAppOutletContext } from '../layouts/appOutletContext'
import { updateMyFullName } from '../services/supabase/profiles'
import { getInitials } from '../utils/formatting'
import RoleBadge from '../components/RoleBadge'

function SettingsPage() {
  const { user, profile, role, signOut, refreshProfile } = useAuth()
  const { showToast } = useAppOutletContext()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const hasChanges = fullName.trim() !== (profile?.full_name ?? '').trim()

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault()
    if (submitting || !hasChanges) return

    setSubmitting(true)
    setError(null)

    const result = await updateMyFullName(fullName)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    await refreshProfile()
    showToast('Your profile was updated.')
  }

  async function handleSignOut() {
    setSigningOut(true)
    const result = await signOut()
    setSigningOut(false)

    if (result.error) {
      showToast(result.error)
    }
  }

  const displayName = profile?.full_name?.trim() || user?.email || ''

  return (
    <div className="mx-auto max-w-xl scroll-mt-20 space-y-6">
      <div>
        <p className="text-sm text-slate-500">Manage your account and session.</p>
      </div>

      <div className="surface-elevated flex items-center gap-4 p-5">
        <span className="brand-wash flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(79,70,229,0.4)]">
          {getInitials(displayName) || '?'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-slate-800">{displayName || 'Your account'}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
        </div>
        {role && <RoleBadge role={role} />}
      </div>

      <section className="surface p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/70 text-indigo-600 ring-1 ring-indigo-100">
            <User className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-800">Account &amp; Profile</h2>
            <p className="text-xs text-slate-400">Your display name is shown throughout the app</p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSaveProfile(e)} className="mt-5 space-y-4">
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="settings-full-name" className="mb-1 block text-xs font-medium text-slate-600">
              Full name
            </label>
            <input
              id="settings-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
              placeholder="Add your name"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {user?.email}
            </div>
            <p className="mt-1 text-xs text-slate-400">Managed by your sign-in provider &mdash; read-only here.</p>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-slate-600">Role</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <Shield className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {role ? <RoleBadge role={role} /> : 'Unknown role'}
            </div>
            <p className="mt-1 text-xs text-slate-400">Assigned by an administrator &mdash; you can&apos;t change this yourself.</p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting || !hasChanges}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      <section className="surface p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/70 text-indigo-600 ring-1 ring-indigo-100">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-800">Security &amp; Session</h2>
            <p className="text-xs text-slate-400">Manage your active session on this device</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Sign out</p>
            <p className="text-xs text-slate-400">End your session on this device.</p>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-3.5 w-3.5" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
