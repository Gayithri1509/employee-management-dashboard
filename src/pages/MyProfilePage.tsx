import { useState } from 'react'
import { Mail, MapPin, Phone, Calendar, Building2, Briefcase, UserX } from 'lucide-react'
import { useAppOutletContext } from '../layouts/appOutletContext'
import { updateEmployeeSelf } from '../services/supabase/employees'
import { formatJoiningDate, getInitials } from '../utils/formatting'
import StatusBadge from '../components/StatusBadge'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

// Employee self-service. There is no auto-linking mechanism (a deliberate
// choice -- linking an auth account to an employee record by email alone
// isn't a safe, deterministic design, so it isn't built here). Instead this
// page relies entirely on RLS: the employees_select policy for the
// 'employee' role already returns only the row where profile_id =
// auth.uid() (see migration 0012), or zero rows if nothing is linked yet --
// so `employees` from the shared org-data fetch is, for this role, already
// exactly "my own record or nothing." No employee id is ever read from the
// client to decide what to show.
function MyProfilePage() {
  const { employees, departmentNameById, loading, employeesError, retryAll, refreshAll, showToast } =
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

  return (
    <div className="mx-auto max-w-xl scroll-mt-20 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500">Your personal employee information.</p>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
            {getInitials(myEmployee.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-slate-800">{myEmployee.name}</h2>
              <StatusBadge status={myEmployee.status} />
            </div>
            <p className="truncate text-sm text-slate-500">{myEmployee.role}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
            {myEmployee.department}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            Joined {formatJoiningDate(myEmployee.joiningDate)}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            {myEmployee.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
            {myEmployee.role}
          </div>
        </dl>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Personal contact</h3>
            {!editing && (
              <button
                type="button"
                onClick={startEditing}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                Edit
              </button>
            )}
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
      </div>
    </div>
  )
}

export default MyProfilePage
