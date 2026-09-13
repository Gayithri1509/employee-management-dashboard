import { useMemo, useState } from 'react'
import { Building2, PlusCircle, Trash2, Pencil } from 'lucide-react'
import { useAppOutletContext } from '../layouts/appOutletContext'
import type { DepartmentRow } from '../types/database'
import { createDepartment, updateDepartment, deleteDepartment, reassignDepartmentEmployees } from '../services/supabase/departments'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import DepartmentFormModal from '../components/DepartmentFormModal'
import ConfirmDialog from '../components/ConfirmDialog'
import DepartmentReassignDialog from '../components/DepartmentReassignDialog'

type FormModalState = { mode: 'create' } | { mode: 'edit'; department: DepartmentRow }
type DeleteFlowState = { department: DepartmentRow; employeeCount: number }

/** A compact active/on-leave/inactive proportion bar -- same status colors as everywhere else in the product (StatusBadge, StatusDonut), just at a glance. */
function StatusMiniBar({ active, onLeave, inactive }: { active: number; onLeave: number; inactive: number }) {
  const total = active + onLeave + inactive
  if (total === 0) {
    return <span className="text-xs text-slate-300">No employees</span>
  }
  return (
    <div
      className="flex h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"
      role="img"
      aria-label={`${active} active, ${onLeave} on leave, ${inactive} inactive`}
    >
      <div className="h-full bg-emerald-500" style={{ width: `${(active / total) * 100}%` }} />
      <div className="h-full bg-amber-500" style={{ width: `${(onLeave / total) * 100}%` }} />
      <div className="h-full bg-slate-400" style={{ width: `${(inactive / total) * 100}%` }} />
    </div>
  )
}

function DepartmentsPage() {
  const { employees, departments, loading, departmentsError, retryAll, refreshAll, showToast } = useAppOutletContext()

  const [formModal, setFormModal] = useState<FormModalState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [deleteFlow, setDeleteFlow] = useState<DeleteFlowState | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const employeeCountByName = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const employee of employees) {
      counts[employee.department] = (counts[employee.department] ?? 0) + 1
    }
    return counts
  }, [employees])

  const statusCountsByName = useMemo(() => {
    const counts: Record<string, { active: number; onLeave: number; inactive: number }> = {}
    for (const employee of employees) {
      const bucket = (counts[employee.department] ??= { active: 0, onLeave: 0, inactive: 0 })
      if (employee.status === 'Active') bucket.active += 1
      else if (employee.status === 'On Leave') bucket.onLeave += 1
      else bucket.inactive += 1
    }
    return counts
  }, [employees])

  if (loading) {
    return <LoadingState message="Loading departments…" />
  }

  if (departmentsError) {
    return <ErrorState message={departmentsError} onRetry={retryAll} />
  }

  function closeFormModal() {
    if (submitting) return
    setFormModal(null)
    setSubmitError(null)
  }

  async function handleFormSubmit(name: string) {
    if (!formModal) return
    setSubmitting(true)
    setSubmitError(null)

    const result =
      formModal.mode === 'create' ? await createDepartment(name) : await updateDepartment(formModal.department.id, name)

    setSubmitting(false)

    if (result.error) {
      setSubmitError(result.error)
      return
    }

    setFormModal(null)
    showToast(formModal.mode === 'create' ? 'Department added successfully.' : 'Department renamed successfully.')
    void refreshAll()
  }

  function handleDeleteClick(department: DepartmentRow) {
    const employeeCount = employeeCountByName[department.name] ?? 0
    setDeleteFlow({ department, employeeCount })
  }

  async function handleDeleteEmpty() {
    if (!deleteFlow) return
    setDeleteBusy(true)
    const result = await deleteDepartment(deleteFlow.department.id)
    setDeleteBusy(false)
    setDeleteFlow(null)

    if (result.error) {
      showToast(result.error)
      return
    }
    showToast(`${deleteFlow.department.name} was deleted.`)
    void refreshAll()
  }

  async function handleReassignAndDelete(targetDepartmentId: string) {
    if (!deleteFlow) return
    setDeleteBusy(true)

    const reassignResult = await reassignDepartmentEmployees(deleteFlow.department.id, targetDepartmentId)
    if (reassignResult.error) {
      setDeleteBusy(false)
      showToast(reassignResult.error)
      return
    }

    const deleteResult = await deleteDepartment(deleteFlow.department.id)
    setDeleteBusy(false)
    setDeleteFlow(null)

    if (deleteResult.error) {
      showToast(deleteResult.error)
      return
    }

    showToast(
      `Moved ${reassignResult.count ?? 0} employee${reassignResult.count === 1 ? '' : 's'} out of ${deleteFlow.department.name} and deleted it.`,
    )
    void refreshAll()
  }

  const otherDepartments = deleteFlow
    ? departments.filter((dept) => dept.id !== deleteFlow.department.id).map((dept) => ({ id: dept.id, name: dept.name }))
    : []

  return (
    <div className="scroll-mt-20 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Organize your workforce into departments.</p>
        </div>
        <button
          type="button"
          onClick={() => setFormModal({ mode: 'create' })}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <PlusCircle className="h-4 w-4" />
          Add Department
        </button>
      </div>

      {departments.length === 0 ? (
        <EmptyState icon={Building2} title="No departments yet" description="Add a department to get started." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Employees</th>
                <th className="px-5 py-3 font-medium">Status mix</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((department) => {
                const statusCounts = statusCountsByName[department.name] ?? { active: 0, onLeave: 0, inactive: 0 }
                return (
                <tr key={department.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-medium text-slate-800">{department.name}</td>
                  <td className="px-5 py-3 text-slate-500">{employeeCountByName[department.name] ?? 0}</td>
                  <td className="px-5 py-3">
                    <StatusMiniBar active={statusCounts.active} onLeave={statusCounts.onLeave} inactive={statusCounts.inactive} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setFormModal({ mode: 'edit', department })}
                        aria-label={`Rename ${department.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(department)}
                        disabled={departments.length <= 1}
                        title={departments.length <= 1 ? 'At least one department is required.' : 'Delete'}
                        aria-label={`Delete ${department.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {formModal && (
        <DepartmentFormModal
          mode={formModal.mode}
          initialName={formModal.mode === 'edit' ? formModal.department.name : ''}
          submitting={submitting}
          submitError={submitError}
          onSubmit={(name) => void handleFormSubmit(name)}
          onClose={closeFormModal}
        />
      )}

      {deleteFlow && deleteFlow.employeeCount === 0 && (
        <ConfirmDialog
          title={`Delete ${deleteFlow.department.name}?`}
          description="This cannot be undone."
          confirmLabel="Delete"
          tone="danger"
          busy={deleteBusy}
          onConfirm={() => void handleDeleteEmpty()}
          onCancel={() => setDeleteFlow(null)}
        />
      )}

      {deleteFlow && deleteFlow.employeeCount > 0 && (
        <DepartmentReassignDialog
          departmentName={deleteFlow.department.name}
          employeeCount={deleteFlow.employeeCount}
          otherDepartments={otherDepartments}
          busy={deleteBusy}
          onConfirm={(targetId) => void handleReassignAndDelete(targetId)}
          onCancel={() => setDeleteFlow(null)}
        />
      )}
    </div>
  )
}

export default DepartmentsPage
