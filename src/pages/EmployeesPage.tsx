import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppOutletContext } from '../layouts/appOutletContext'
import type { Employee, EmployeeStatus } from '../types/employee'
import { createEmployee, updateEmployee, setEmployeeStatus, deleteEmployee } from '../services/supabase/employees'
import {
  fetchLinkableProfiles,
  linkEmployeeProfile,
  unlinkEmployeeProfile,
  type LinkableProfile,
} from '../services/supabase/employeeLinking'
import { sortEmployees, type SortOption } from '../utils/employeeSort'
import { filterEmployees } from '../utils/employeeFilter'
import EmployeeDirectory from '../components/EmployeeDirectory'
import EmployeeFormModal, { type EmployeeFormValues } from '../components/EmployeeFormModal'
import ConfirmDialog from '../components/ConfirmDialog'
import LinkEmployeeDialog from '../components/LinkEmployeeDialog'
import EmployeeGridSkeleton from '../components/EmployeeGridSkeleton'
import ErrorState from '../components/ErrorState'

type ConfirmActionType = 'deactivate' | 'reactivate' | 'delete' | 'unlink'

interface ConfirmAction {
  type: ConfirmActionType
  employee: Employee
}

type FormModalState = { mode: 'create' } | { mode: 'edit'; employee: Employee }

function EmployeesPage() {
  const {
    employees,
    departments,
    departmentNameById,
    loading,
    employeesError,
    retryAll,
    refreshAll,
    capabilities,
    showToast,
  } = useAppOutletContext()

  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '')
  const [department, setDepartment] = useState('all')
  const [status, setStatus] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')

  const [formModal, setFormModal] = useState<FormModalState | null>(
    searchParams.get('add') ? { mode: 'create' } : null,
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [busyEmployeeId, setBusyEmployeeId] = useState<string | null>(null)

  const [linkTarget, setLinkTarget] = useState<Employee | null>(null)
  const [linkableProfiles, setLinkableProfiles] = useState<LinkableProfile[]>([])
  const [linkableProfilesLoading, setLinkableProfilesLoading] = useState(false)
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  // Consumes the one-time deep-link params (?q= from the header quick
  // search, ?add=1 from the Overview page's Quick Actions) so they don't
  // linger in the URL or re-trigger anything on a later render.
  useEffect(() => {
    if (searchParams.get('add') || searchParams.get('q')) {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const departmentNames = useMemo(() => departments.map((dept) => dept.name), [departments])
  const departmentIdByName = useMemo(
    () => Object.fromEntries(departments.map((dept) => [dept.name, dept.id])),
    [departments],
  )

  const filteredEmployees = filterEmployees(employees, { searchTerm, department, status })
  const displayedEmployees = sortEmployees(filteredEmployees, sortBy)
  const hasActiveFilters = searchTerm.trim() !== '' || department !== 'all' || status !== 'all'

  function handleResetFilters() {
    setSearchTerm('')
    setDepartment('all')
    setStatus('all')
  }

  function closeFormModal() {
    if (submitting) return
    setFormModal(null)
    setSubmitError(null)
  }

  async function handleFormSubmit(values: EmployeeFormValues) {
    if (!formModal) return
    setSubmitting(true)
    setSubmitError(null)

    const departmentId = departmentIdByName[values.department]
    if (!departmentId) {
      setSubmitError('Select a valid department.')
      setSubmitting(false)
      return
    }

    const input = {
      name: values.name.trim(),
      role: values.role.trim(),
      departmentId,
      email: values.email.trim(),
      phone: values.phone.trim(),
      location: values.location.trim(),
      joiningDate: values.joiningDate,
    }

    const result =
      formModal.mode === 'create'
        ? await createEmployee(input, departmentNameById)
        : await updateEmployee(formModal.employee.id, input, departmentNameById)

    setSubmitting(false)

    if (result.error && !result.data) {
      setSubmitError(result.error)
      return
    }

    setFormModal(null)
    showToast(formModal.mode === 'create' ? 'Employee added successfully.' : 'Employee updated successfully.')
    void refreshAll()
  }

  async function handleConfirm() {
    if (!confirmAction) return
    setConfirmBusy(true)
    setBusyEmployeeId(confirmAction.employee.id)

    if (confirmAction.type === 'delete') {
      const result = await deleteEmployee(confirmAction.employee.id)
      setConfirmBusy(false)
      setBusyEmployeeId(null)
      setConfirmAction(null)

      if (result.error) {
        showToast(result.error)
        return
      }
      showToast(`${confirmAction.employee.name} was deleted.`)
      void refreshAll()
      return
    }

    if (confirmAction.type === 'unlink') {
      const result = await unlinkEmployeeProfile(confirmAction.employee.id)
      setConfirmBusy(false)
      setBusyEmployeeId(null)
      setConfirmAction(null)

      if (result.error) {
        showToast(result.error)
        return
      }
      showToast(`${confirmAction.employee.name}'s account was unlinked.`)
      void refreshAll()
      return
    }

    const nextStatus: EmployeeStatus = confirmAction.type === 'deactivate' ? 'Inactive' : 'Active'
    const result = await setEmployeeStatus(confirmAction.employee.id, nextStatus, departmentNameById)
    setConfirmBusy(false)
    setBusyEmployeeId(null)
    setConfirmAction(null)

    if (result.error && !result.data) {
      showToast(result.error)
      return
    }

    showToast(
      confirmAction.type === 'deactivate'
        ? `${confirmAction.employee.name} was deactivated.`
        : `${confirmAction.employee.name} was reactivated.`,
    )
    void refreshAll()
  }

  async function handleOpenLinkDialog(employee: Employee) {
    setLinkTarget(employee)
    setLinkError(null)
    setLinkableProfilesLoading(true)

    const result = await fetchLinkableProfiles()

    if (result.data) {
      setLinkableProfiles(result.data)
    } else {
      setLinkableProfiles([])
      setLinkError(result.error ?? 'Could not load linkable accounts.')
    }

    setLinkableProfilesLoading(false)
  }

  function closeLinkDialog() {
    if (linkBusy) return
    setLinkTarget(null)
    setLinkableProfiles([])
    setLinkError(null)
  }

  async function handleConfirmLink(profileId: string) {
    if (!linkTarget) return
    setLinkBusy(true)
    setLinkError(null)

    const result = await linkEmployeeProfile(linkTarget.id, profileId)
    setLinkBusy(false)

    if (result.error) {
      setLinkError(result.error)
      return
    }

    showToast(`${linkTarget.name}'s account was linked.`)
    setLinkTarget(null)
    setLinkableProfiles([])
    void refreshAll()
  }

  if (loading) {
    return <EmployeeGridSkeleton />
  }

  if (employeesError) {
    return <ErrorState message={employeesError} onRetry={retryAll} />
  }

  return (
    <div className="scroll-mt-20">
      <EmployeeDirectory
        employees={displayedEmployees}
        totalCount={employees.length}
        searchTerm={searchTerm}
        department={department}
        status={status}
        sortBy={sortBy}
        departments={departmentNames}
        canCreateEmployee={capabilities.canCreateEmployee}
        canEdit={capabilities.canEditEmployee}
        canToggleStatus={capabilities.canDeactivateEmployee}
        canDelete={capabilities.canDeleteEmployee}
        canManageLinking={capabilities.canManageEmployeeLinking}
        busyEmployeeId={busyEmployeeId}
        onSearchChange={setSearchTerm}
        onDepartmentChange={setDepartment}
        onStatusChange={setStatus}
        onSortChange={setSortBy}
        onAddEmployee={() => {
          setSubmitError(null)
          setFormModal({ mode: 'create' })
        }}
        onEditEmployee={(employee) => {
          setSubmitError(null)
          setFormModal({ mode: 'edit', employee })
        }}
        onToggleStatus={(employee) =>
          setConfirmAction({ type: employee.status === 'Active' ? 'deactivate' : 'reactivate', employee })
        }
        onDeleteEmployee={(employee) => setConfirmAction({ type: 'delete', employee })}
        onLinkAccount={(employee) => void handleOpenLinkDialog(employee)}
        onUnlinkAccount={(employee) => setConfirmAction({ type: 'unlink', employee })}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
      />

      {formModal && (
        <EmployeeFormModal
          mode={formModal.mode}
          employeeId={formModal.mode === 'edit' ? formModal.employee.id : undefined}
          departments={departmentNames}
          canChangeDepartment={formModal.mode === 'create' || capabilities.canChangeEmployeeDepartment}
          submitting={submitting}
          submitError={submitError}
          initialValues={
            formModal.mode === 'edit'
              ? {
                  name: formModal.employee.name,
                  role: formModal.employee.role,
                  department: formModal.employee.department,
                  email: formModal.employee.email,
                  phone: formModal.employee.phone,
                  location: formModal.employee.location,
                  joiningDate: formModal.employee.joiningDate,
                }
              : {
                  name: '',
                  role: '',
                  department: departmentNames[0] ?? '',
                  email: '',
                  phone: '',
                  location: '',
                  joiningDate: new Date().toISOString().slice(0, 10),
                }
          }
          onSubmit={(values) => void handleFormSubmit(values)}
          onClose={closeFormModal}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction.type === 'delete'
              ? `Delete ${confirmAction.employee.name}?`
              : confirmAction.type === 'deactivate'
                ? `Deactivate ${confirmAction.employee.name}?`
                : confirmAction.type === 'reactivate'
                  ? `Reactivate ${confirmAction.employee.name}?`
                  : `Unlink account for ${confirmAction.employee.name}?`
          }
          description={
            confirmAction.type === 'delete'
              ? 'This permanently removes the employee record. This cannot be undone.'
              : confirmAction.type === 'deactivate'
                ? 'This marks the employee as Inactive. You can reactivate them at any time.'
                : confirmAction.type === 'reactivate'
                  ? 'This marks the employee as Active again.'
                  : "This removes their self-service link. They'll lose access to their My Profile page until relinked."
          }
          confirmLabel={
            confirmAction.type === 'delete'
              ? 'Delete'
              : confirmAction.type === 'deactivate'
                ? 'Deactivate'
                : confirmAction.type === 'reactivate'
                  ? 'Reactivate'
                  : 'Unlink'
          }
          tone={confirmAction.type === 'delete' || confirmAction.type === 'unlink' ? 'danger' : 'default'}
          busy={confirmBusy}
          onConfirm={() => void handleConfirm()}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {linkTarget && (
        <LinkEmployeeDialog
          employeeName={linkTarget.name}
          profiles={linkableProfiles}
          loading={linkableProfilesLoading}
          busy={linkBusy}
          error={linkError}
          onConfirm={(profileId) => void handleConfirmLink(profileId)}
          onCancel={closeLinkDialog}
        />
      )}
    </div>
  )
}

export default EmployeesPage
