import { useState } from 'react'
import { Mail, MapPin, Phone, Calendar, Building2, Clock, UserX, ShieldCheck, History, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAppOutletContext } from '../layouts/appOutletContext'
import { updateEmployeeSelf } from '../services/supabase/employees'
import { formatJoiningDate, formatRoleLabel, formatTenure, getInitials } from '../utils/formatting'
import StatusBadge from '../components/StatusBadge'
import ActivityLogEntry from '../components/ActivityLogEntry'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

// Employee 360: a self-service workspace built entirely from real, already-
// loaded data -- no fabricated attendance/leave/achievement metrics. There
// is no auto-linking mechanism (a deliberate choice -- linking an auth
// account to an employee record by email alone isn't a safe, deterministic
// design, so it isn't built here). Instead this page relies entirely on
// RLS: the employees_select policy for the 'employee' role already returns
// only the row where profile_id = auth.uid() (see migration 0012), or zero
// rows if nothing is linked yet -- so `employees` from the shared org-data
// fetch is, for this role, already exactly "my own record or nothing." No
// employee id is ever read from the client to decide what to show.
//
// "Work Journey" and "Recent Activity" are presented as one combined
// timeline rather than two separate sections with duplicate content: both
// would otherwise draw from the exact same source (activity_logs entries
// where this employee is the actor or the target, already RLS-scoped to
// their own identity) -- there is no separate "milestones" data model to
// draw a genuine distinction from, and inventing one would mean showing
// fabricated data.
//
// Attendance/leave/monthly-yearly work history is intentionally NOT shown
// here: no such table exists in the schema (see supabase/migrations/), and
// the brief for this feature is explicit that fabricating those numbers is
// worse than omitting the section entirely.
function MyProfilePage() {
  const { profile, role } = useAuth()
  const { employees, departmentNameById, activityEntries, loading, employeesError, retryAll, refreshAll, showToast } =
    useAppOutletContext()

  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return <LoadingState message="Loading your profile…" />
  }

  if (employeesError) {
    return <ErrorState message={employeesError} onRetry={retryAll} />
  }

  const myEmployee = employees[0] ?? null

  if (!myEmployee) {
    return (
      <EmptyState
        icon={UserX}
        title="Profile not linked"
        description="Your account isn't linked to an employee record yet. Contact HR or your administrator to get set up."
      />
    )
  }

  function startEditing() {
    if (!myEmployee) return
    setPhone(myEmployee.phone)
    setLocation(myEmployee.location)
    setError(null)
    setEditing(true)
  }

  async function handleSave() {
    setSubmitting(true)
    setError(null)
    const result = await updateEmployeeSelf({ phone: phone.trim(), location: location.trim() }, departmentNameById)
    setSubmitting(false)

    if (result.error && !result.data) {
      setError(result.error)
      return
    }

    setEditing(false)
    showToast('Your profile was updated.')
    void refreshAll()
  }

  const myActivity = activityEntries.filter((entry) => entry.employeeId === myEmployee.id)

  const completenessChecks = [
    { label: 'Display name set', complete: Boolean(profile?.full_name?.trim()) },
    { label: 'Phone number added', complete: Boolean(myEmployee.phone.trim()) },
    { label: 'Location added', complete: Boolean(myEmployee.location.trim()) },
  ]
  const completenessPercent = Math.round(
    (completenessChecks.filter((check) => check.complete).length / completenessChecks.length) * 100,
  )

  return (
    <div className="mx-auto max-w-4xl scroll-mt-20 space-y-6">
      <div>
        <p className="text-sm text-slate-500">Your personal employee workspace.</p>
      </div>

      <div className="surface-elevated overflow-hidden">
        <div className="relative flex flex-wrap items-center gap-4 overflow-hidden border-b border-slate-100 bg-slate-50/60 px-6 py-6">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(closest-side, var(--color-brand), transparent)' }}
          />
          <span className="brand-wash relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white shadow-[0_4px_16px_-4px_rgba(79,70,229,0.5)]">
            {getInitials(myEmployee.name)}
          </span>
          <div className="relative min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-bold tracking-tight text-slate-900">{myEmployee.name}</h2>
              <StatusBadge status={myEmployee.status} />
            </div>
            <p className="truncate text-sm text-slate-500">
              {myEmployee.role} &middot; {myEmployee.department}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="surface p-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand">Employment</h3>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                {myEmployee.department}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                Joined {formatJoiningDate(myEmployee.joiningDate)}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                {formatTenure(myEmployee.joiningDate)} tenure
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
                {myEmployee.status}
              </div>
            </dl>
          </div>

          <div className="surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand">Contact</h3>
              {!editing && (
                <button type="button" onClick={startEditing} className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                  Edit
                </button>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{myEmployee.email}</span>
              </div>
            </div>

            {editing ? (
              <div className="mt-3 space-y-3">
                {error && (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    {error}
                  </p>
                )}
                <div>
                  <label htmlFor="self-phone" className="mb-1 block text-xs font-medium text-slate-600">
                    Phone
                  </label>
                  <input
                    id="self-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label htmlFor="self-location" className="mb-1 block text-xs font-medium text-slate-600">
                    Location
                  </label>
                  <input
                    id="self-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    disabled={submitting}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={submitting}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  {myEmployee.phone || <span className="text-slate-400">Not set</span>}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  {myEmployee.location || <span className="text-slate-400">Not set</span>}
                </div>
              </dl>
            )}
          </div>

          <div className="surface p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100/70 text-indigo-600 ring-1 ring-indigo-100">
                <History className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-slate-800">Activity &amp; Work Journey</h3>
                <p className="text-xs text-slate-400">A real, automatically generated record of changes to your record</p>
              </div>
            </div>
            <div className="mt-4">
              {myActivity.length === 0 ? (
                <EmptyState icon={History} title="No activity yet" description="Changes to your record will appear here automatically." />
              ) : (
                <ul>
                  {myActivity.map((entry, index) => (
                    <ActivityLogEntry key={entry.id} entry={entry} isLast={index === myActivity.length - 1} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface p-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand">Account</h3>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Application role</span>
                <span className="font-medium text-slate-700">{formatRoleLabel(role)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Account status</span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Linked
                </span>
              </div>
            </dl>
          </div>

          <div className="surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand">Profile Completeness</h3>
              <span className="text-sm font-semibold tabular-nums text-slate-800">{completenessPercent}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${completenessPercent}%` }}
              />
            </div>
            <ul className="mt-4 space-y-2">
              {completenessChecks.map((check) => (
                <li key={check.label} className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${check.complete ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className={check.complete ? 'text-slate-600' : 'text-slate-400'}>{check.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyProfilePage
