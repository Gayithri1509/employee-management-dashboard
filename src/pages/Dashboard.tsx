import { useEffect, useState } from 'react'
import { Building2, CalendarClock, UserCheck, Users } from 'lucide-react'
import type { Employee } from '../types/employee'
import type { ActivityEntry } from '../types/activity'
import { type SectionId } from '../types/navigation'
import { loadEmployees, saveEmployees } from '../services/storage'
import { loadActivityLog, saveActivityLog, generateActivityId } from '../services/activityStorage'
import Sidebar from '../components/layout/Sidebar'
import TopHeader from '../components/layout/TopHeader'
import KpiCard from '../components/kpi/KpiCard'
import WorkforcePulse from '../components/insights/WorkforcePulse'
import DepartmentIntelligence from '../components/insights/DepartmentIntelligence'
import EmployeeSpotlight from '../components/EmployeeSpotlight'
import QuickActions from '../components/QuickActions'
import EmployeeDirectory from '../components/EmployeeDirectory'
import EmployeeEditModal from '../components/EmployeeEditModal'
import ActivityLogPanel from '../components/ActivityLogPanel'
import ProductInsights from '../components/ProductInsights'
import Toast from '../components/Toast'

// All Employee fields that can actually change via the edit form, i.e.
// everything except the immutable id. Used to diff a save against the
// employee's previous values for the Smart Global System Activity Log.
type EditableField = Exclude<keyof Employee, 'id'>

const EDITABLE_FIELDS: EditableField[] = [
  'name',
  'role',
  'department',
  'email',
  'phone',
  'location',
  'status',
  'joiningDate',
]

const FIELD_LABELS: Record<EditableField, string> = {
  name: 'Name',
  role: 'Role',
  department: 'Department',
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  status: 'Status',
  joiningDate: 'Joining Date',
}

/**
 * Builds the activity-log message for a single employee edit by comparing
 * the previous and updated records (id is ignored — it never changes).
 * Returns null when nothing editable actually changed, so callers can skip
 * creating an activity entry for a no-op save. A single changed field gets
 * specific, human-readable wording; multiple changed fields collapse into
 * one combined entry listing the changed field labels.
 */
function buildEmployeeUpdateMessage(previous: Employee, updated: Employee): string | null {
  const changedFields = EDITABLE_FIELDS.filter((field) => previous[field] !== updated[field])

  if (changedFields.length === 0) {
    return null
  }

  if (changedFields.length === 1) {
    const field = changedFields[0]
    switch (field) {
      case 'department':
        return `${updated.name} moved from ${previous.department} to ${updated.department}.`
      case 'status':
        return `${updated.name}'s status changed from ${previous.status} to ${updated.status}.`
      case 'role':
        return `${updated.name}'s role changed from ${previous.role} to ${updated.role}.`
      case 'name':
        return `${previous.name}'s name was changed to ${updated.name}.`
      case 'email':
        return `${updated.name}'s email was changed to ${updated.email}.`
      case 'phone':
        return `${updated.name}'s phone number was changed to ${updated.phone}.`
      case 'location':
        return `${updated.name}'s location was changed to ${updated.location}.`
      case 'joiningDate':
        return `${updated.name}'s joining date was changed to ${updated.joiningDate}.`
    }
  }

  const changedLabels = changedFields.map((field) => FIELD_LABELS[field])
  return `${updated.name}'s profile was updated: ${changedLabels.join(', ')} changed.`
}

function Dashboard() {
  // Loaded once, synchronously, from localStorage (falling back to the
  // fictional sample dataset) so the first paint already shows the right data.
  const [employees, setEmployees] = useState<Employee[]>(() => loadEmployees())

  // Persist whenever the employee data itself changes — not on every render,
  // and never for search/filter/editingEmployee, which are session-only UI state.
  useEffect(() => {
    saveEmployees(employees)
  }, [employees])

  // Activity log: same lazy-init + effect-persist pattern as employees, but
  // as an entirely separate piece of state backed by its own storage key.
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(() => loadActivityLog())

  useEffect(() => {
    saveActivityLog(activityLog)
  }, [activityLog])

  const [searchTerm, setSearchTerm] = useState('')
  const [department, setDepartment] = useState('all')
  const [status, setStatus] = useState('all')
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  // Application-shell UI state (new in this redesign): which section the
  // sidebar highlights, whether the mobile nav drawer is open, and the
  // lightweight save-confirmation toast. None of this is persisted.
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (toastMessage === null) return
    const timeoutId = window.setTimeout(() => setToastMessage(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  // Dashboard-wide stats, always derived from the full employees array (not
  // the filtered/displayed list) so they reflect true organization totals
  // regardless of any active search or filter.
  const activeCount = employees.filter((employee) => employee.status === 'Active').length
  const onLeaveCount = employees.filter((employee) => employee.status === 'On Leave').length
  const inactiveCount = employees.filter((employee) => employee.status === 'Inactive').length
  const departmentCount = new Set(employees.map((employee) => employee.department)).size

  const departmentBreakdown = Object.entries(
    employees.reduce<Record<string, number>>((counts, employee) => {
      counts[employee.department] = (counts[employee.department] ?? 0) + 1
      return counts
    }, {})
  )
    .map(([departmentName, count]) => ({ department: departmentName, count }))
    .sort((a, b) => b.count - a.count)

  // Deterministic, data-driven spotlight: the employee with the earliest
  // joining date (ISO date strings compare lexicographically = chronologically).
  const spotlightEmployee = employees.reduce<Employee | undefined>(
    (longestTenured, employee) =>
      !longestTenured || employee.joiningDate < longestTenured.joiningDate ? employee : longestTenured,
    undefined
  )

  const normalizedQuery = searchTerm.trim().toLowerCase()

  const displayedEmployees = employees.filter((employee) => {
    const matchesSearch =
      normalizedQuery === '' ||
      employee.name.toLowerCase().includes(normalizedQuery) ||
      employee.role.toLowerCase().includes(normalizedQuery) ||
      employee.department.toLowerCase().includes(normalizedQuery) ||
      employee.email.toLowerCase().includes(normalizedQuery)

    const matchesDepartment = department === 'all' || employee.department === department
    const matchesStatus = status === 'all' || employee.status === status

    return matchesSearch && matchesDepartment && matchesStatus
  })

  const hasActiveFilters = searchTerm.trim() !== '' || department !== 'all' || status !== 'all'

  function handleResetFilters() {
    setSearchTerm('')
    setDepartment('all')
    setStatus('all')
  }

  function handleNavigate(sectionId: SectionId) {
    setActiveSection(sectionId)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  function handleSaveEmployee(updated: Employee) {
    const previous = employees.find((employee) => employee.id === updated.id)

    setEmployees((prev) => prev.map((employee) => (employee.id === updated.id ? updated : employee)))

    if (previous) {
      const message = buildEmployeeUpdateMessage(previous, updated)
      if (message !== null) {
        const newEntry: ActivityEntry = {
          id: generateActivityId(),
          type: 'employee-update',
          message,
          timestamp: new Date().toISOString(),
          employeeId: updated.id,
        }
        // Prepend so the newest activity always appears first.
        setActivityLog((prev) => [newEntry, ...prev])
      }
    }

    setEditingEmployee(null)
    setToastMessage('Employee updated successfully')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
        <TopHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenActivity={() => handleNavigate('activity')}
          activityCount={activityLog.length}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <section id="overview" className="scroll-mt-20 space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-sm sm:px-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl"
              />
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-300">Workforce Overview</p>
              <h2 className="relative mt-1 max-w-xl text-2xl font-semibold sm:text-3xl">
                Monitor your organization, people, and activity from one place.
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Total Employees"
                value={employees.length}
                helperText="Across all departments"
                icon={Users}
                accent="indigo"
              />
              <KpiCard
                label="Active"
                value={activeCount}
                helperText={`${employees.length === 0 ? 0 : Math.round((activeCount / employees.length) * 100)}% of workforce`}
                icon={UserCheck}
                accent="emerald"
              />
              <KpiCard label="On Leave" value={onLeaveCount} helperText="Temporarily away" icon={CalendarClock} accent="amber" />
              <KpiCard
                label="Departments"
                value={departmentCount}
                helperText="Represented in your team"
                icon={Building2}
                accent="slate"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <WorkforcePulse active={activeCount} onLeave={onLeaveCount} inactive={inactiveCount} total={employees.length} />
              <DepartmentIntelligence breakdown={departmentBreakdown} total={employees.length} />
              {spotlightEmployee && <EmployeeSpotlight employee={spotlightEmployee} />}
            </div>

            <QuickActions
              onViewEmployees={() => handleNavigate('employees')}
              onViewActivity={() => handleNavigate('activity')}
            />
          </section>

          <section id="employees" className="scroll-mt-20 mt-10">
            <EmployeeDirectory
              employees={displayedEmployees}
              totalCount={employees.length}
              searchTerm={searchTerm}
              department={department}
              status={status}
              onSearchChange={setSearchTerm}
              onDepartmentChange={setDepartment}
              onStatusChange={setStatus}
              onEditEmployee={(employee) => setEditingEmployee(employee)}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={handleResetFilters}
            />
          </section>

          <section id="activity" className="scroll-mt-20 mt-10">
            <ActivityLogPanel entries={activityLog} />
          </section>

          <section id="insights" className="scroll-mt-20 mb-6 mt-10">
            <ProductInsights />
          </section>
        </main>
      </div>

      {editingEmployee && (
        <EmployeeEditModal
          employee={editingEmployee}
          onSave={handleSaveEmployee}
          onClose={() => setEditingEmployee(null)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default Dashboard
