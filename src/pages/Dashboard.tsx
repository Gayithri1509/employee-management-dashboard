import { useEffect, useState } from 'react'
import type { Employee } from '../types/employee'
import type { ActivityEntry } from '../types/activity'
import { loadEmployees, saveEmployees } from '../services/storage'
import { loadActivityLog, saveActivityLog, generateActivityId } from '../services/activityStorage'
import DashboardHeader from '../components/DashboardHeader'
import DashboardSummary from '../components/DashboardSummary'
import ControlsBar from '../components/ControlsBar'
import EmployeeGrid from '../components/EmployeeGrid'
import EmployeeEditModal from '../components/EmployeeEditModal'
import ActivityLogPanel from '../components/ActivityLogPanel'
import EvaluatorSection from '../components/EvaluatorSection'

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

  // Summary counts are derived from the full employees array (not the
  // filtered/displayed list) and recompute on every render, so they stay in
  // sync automatically whenever an edit changes employees.
  const activeCount = employees.filter((employee) => employee.status === 'Active').length
  const departmentCount = new Set(employees.map((employee) => employee.department)).size

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
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />
      <DashboardSummary
        totalEmployees={employees.length}
        activeCount={activeCount}
        departmentCount={departmentCount}
      />
      <ControlsBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        department={department}
        status={status}
        onDepartmentChange={setDepartment}
        onStatusChange={setStatus}
      />
      <EmployeeGrid
        employees={displayedEmployees}
        onEditEmployee={(employee) => setEditingEmployee(employee)}
      />
      <ActivityLogPanel entries={activityLog} />
      <EvaluatorSection />
      {editingEmployee && (
        <EmployeeEditModal
          employee={editingEmployee}
          onSave={handleSaveEmployee}
          onClose={() => setEditingEmployee(null)}
        />
      )}
    </div>
  )
}

export default Dashboard
