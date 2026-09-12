import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Employee } from '../types/employee'
import { DEPARTMENTS, EMPLOYEE_STATUSES } from '../types/employee'

interface EmployeeEditModalProps {
  employee: Employee
  onSave: (updated: Employee) => void
  onClose: () => void
}

type FormErrors = Partial<Record<keyof Employee, string>>

function getTodayIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function validate(values: Employee): FormErrors {
  const errors: FormErrors = {}

  if (values.name.trim() === '') errors.name = 'Name is required.'
  if (values.role.trim() === '') errors.role = 'Role is required.'

  if (values.email.trim() === '') {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (values.phone.trim() === '') errors.phone = 'Phone is required.'
  if (values.location.trim() === '') errors.location = 'Location is required.'

  if (values.joiningDate.trim() === '') {
    errors.joiningDate = 'Joining date is required.'
  } else if (values.joiningDate > getTodayIso()) {
    errors.joiningDate = 'Joining date cannot be in the future.'
  }

  return errors
}

function EmployeeEditModal({ employee, onSave, onClose }: EmployeeEditModalProps) {
  const [formValues, setFormValues] = useState<Employee>(employee)
  const [errors, setErrors] = useState<FormErrors>({})

  const dialogRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('input, select, button')
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleChange<K extends keyof Employee>(field: K, value: Employee[K]) {
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const validationErrors = validate(formValues)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length === 0) {
      onSave(formValues)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-employee-heading"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 id="edit-employee-heading" className="text-lg font-semibold text-slate-800">
          Edit Employee
        </h2>
        <p className="mt-1 text-xs text-slate-400">Employee ID: {employee.id}</p>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
          <div>
            <label htmlFor="edit-name" className="mb-1 block text-xs font-medium text-slate-600">
              Name
            </label>
            <input
              id="edit-name"
              ref={nameInputRef}
              type="text"
              value={formValues.name}
              onChange={(e) => handleChange('name', e.target.value)}
              aria-describedby={errors.name ? 'edit-name-error' : undefined}
              aria-invalid={errors.name ? true : undefined}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            />
            {errors.name && (
              <p id="edit-name-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="edit-role" className="mb-1 block text-xs font-medium text-slate-600">
              Role
            </label>
            <input
              id="edit-role"
              type="text"
              value={formValues.role}
              onChange={(e) => handleChange('role', e.target.value)}
              aria-describedby={errors.role ? 'edit-role-error' : undefined}
              aria-invalid={errors.role ? true : undefined}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            />
            {errors.role && (
              <p id="edit-role-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.role}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-department" className="mb-1 block text-xs font-medium text-slate-600">
                Department
              </label>
              <select
                id="edit-department"
                value={formValues.department}
                onChange={(e) => handleChange('department', e.target.value as Employee['department'])}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-status" className="mb-1 block text-xs font-medium text-slate-600">
                Status
              </label>
              <select
                id="edit-status"
                value={formValues.status}
                onChange={(e) => handleChange('status', e.target.value as Employee['status'])}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
              >
                {EMPLOYEE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="edit-email" className="mb-1 block text-xs font-medium text-slate-600">
              Email
            </label>
            <input
              id="edit-email"
              type="email"
              value={formValues.email}
              onChange={(e) => handleChange('email', e.target.value)}
              aria-describedby={errors.email ? 'edit-email-error' : undefined}
              aria-invalid={errors.email ? true : undefined}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            />
            {errors.email && (
              <p id="edit-email-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="edit-phone" className="mb-1 block text-xs font-medium text-slate-600">
              Phone
            </label>
            <input
              id="edit-phone"
              type="tel"
              value={formValues.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              aria-describedby={errors.phone ? 'edit-phone-error' : undefined}
              aria-invalid={errors.phone ? true : undefined}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            />
            {errors.phone && (
              <p id="edit-phone-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.phone}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="edit-location" className="mb-1 block text-xs font-medium text-slate-600">
              Location
            </label>
            <input
              id="edit-location"
              type="text"
              value={formValues.location}
              onChange={(e) => handleChange('location', e.target.value)}
              aria-describedby={errors.location ? 'edit-location-error' : undefined}
              aria-invalid={errors.location ? true : undefined}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            />
            {errors.location && (
              <p id="edit-location-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.location}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="edit-joiningDate" className="mb-1 block text-xs font-medium text-slate-600">
              Joining Date
            </label>
            <input
              id="edit-joiningDate"
              type="date"
              value={formValues.joiningDate}
              max={getTodayIso()}
              onChange={(e) => handleChange('joiningDate', e.target.value)}
              aria-describedby={errors.joiningDate ? 'edit-joiningDate-error' : undefined}
              aria-invalid={errors.joiningDate ? true : undefined}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            />
            {errors.joiningDate && (
              <p id="edit-joiningDate-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.joiningDate}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmployeeEditModal
