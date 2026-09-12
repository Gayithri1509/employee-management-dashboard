import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
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

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100'
const labelClass = 'mb-1 block text-xs font-medium text-slate-600'
const errorClass = 'mt-1 text-xs text-red-600'
const sectionHeadingClass = 'text-xs font-semibold uppercase tracking-wide text-indigo-500'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out] motion-reduce:animate-none">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-employee-heading"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl animate-[modalIn_0.2s_ease-out] motion-reduce:animate-none"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id="edit-employee-heading" className="text-base font-semibold text-slate-800">
              Edit Employee
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">Employee ID: {employee.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <section>
              <h3 className={sectionHeadingClass}>Basic information</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="edit-name" className={labelClass}>
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
                    className={inputClass}
                  />
                  {errors.name && (
                    <p id="edit-name-error" role="alert" className={errorClass}>
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-role" className={labelClass}>
                    Role
                  </label>
                  <input
                    id="edit-role"
                    type="text"
                    value={formValues.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    aria-describedby={errors.role ? 'edit-role-error' : undefined}
                    aria-invalid={errors.role ? true : undefined}
                    className={inputClass}
                  />
                  {errors.role && (
                    <p id="edit-role-error" role="alert" className={errorClass}>
                      {errors.role}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-5">
              <h3 className={sectionHeadingClass}>Work information</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-department" className={labelClass}>
                    Department
                  </label>
                  <select
                    id="edit-department"
                    value={formValues.department}
                    onChange={(e) => handleChange('department', e.target.value as Employee['department'])}
                    className={inputClass}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-status" className={labelClass}>
                    Status
                  </label>
                  <select
                    id="edit-status"
                    value={formValues.status}
                    onChange={(e) => handleChange('status', e.target.value as Employee['status'])}
                    className={inputClass}
                  >
                    {EMPLOYEE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label htmlFor="edit-joiningDate" className={labelClass}>
                    Joining date
                  </label>
                  <input
                    id="edit-joiningDate"
                    type="date"
                    value={formValues.joiningDate}
                    max={getTodayIso()}
                    onChange={(e) => handleChange('joiningDate', e.target.value)}
                    aria-describedby={errors.joiningDate ? 'edit-joiningDate-error' : undefined}
                    aria-invalid={errors.joiningDate ? true : undefined}
                    className={inputClass}
                  />
                  {errors.joiningDate && (
                    <p id="edit-joiningDate-error" role="alert" className={errorClass}>
                      {errors.joiningDate}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-5">
              <h3 className={sectionHeadingClass}>Contact information</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="edit-email" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    value={formValues.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    aria-describedby={errors.email ? 'edit-email-error' : undefined}
                    aria-invalid={errors.email ? true : undefined}
                    className={inputClass}
                  />
                  {errors.email && (
                    <p id="edit-email-error" role="alert" className={errorClass}>
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-phone" className={labelClass}>
                    Phone
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    value={formValues.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    aria-describedby={errors.phone ? 'edit-phone-error' : undefined}
                    aria-invalid={errors.phone ? true : undefined}
                    className={inputClass}
                  />
                  {errors.phone && (
                    <p id="edit-phone-error" role="alert" className={errorClass}>
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-location" className={labelClass}>
                    Location
                  </label>
                  <input
                    id="edit-location"
                    type="text"
                    value={formValues.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    aria-describedby={errors.location ? 'edit-location-error' : undefined}
                    aria-invalid={errors.location ? true : undefined}
                    className={inputClass}
                  />
                  {errors.location && (
                    <p id="edit-location-error" role="alert" className={errorClass}>
                      {errors.location}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
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
