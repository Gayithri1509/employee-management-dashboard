import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

export interface EmployeeFormValues {
  name: string
  role: string
  department: string
  email: string
  phone: string
  location: string
  joiningDate: string
}

type FormErrors = Partial<Record<keyof EmployeeFormValues, string>>

interface EmployeeFormModalProps {
  mode: 'create' | 'edit'
  initialValues: EmployeeFormValues
  employeeId?: string
  departments: string[]
  /** false disables the department field (hr_staff editing an existing employee -- the server rejects the change anyway, but disabling it avoids a confusing round-trip error). */
  canChangeDepartment: boolean
  submitting: boolean
  submitError: string | null
  onSubmit: (values: EmployeeFormValues) => void
  onClose: () => void
}

function getTodayIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function validate(values: EmployeeFormValues): FormErrors {
  const errors: FormErrors = {}

  if (values.name.trim() === '') errors.name = 'Name is required.'
  if (values.role.trim() === '') errors.role = 'Role is required.'
  if (values.department.trim() === '') errors.department = 'Department is required.'

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
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'
const labelClass = 'mb-1 block text-xs font-medium text-slate-600'
const errorClass = 'mt-1 text-xs text-red-600'
const sectionHeadingClass = 'text-xs font-semibold uppercase tracking-wide text-indigo-500'

function EmployeeFormModal({
  mode,
  initialValues,
  employeeId,
  departments,
  canChangeDepartment,
  submitting,
  submitError,
  onSubmit,
  onClose,
}: EmployeeFormModalProps) {
  const [formValues, setFormValues] = useState<EmployeeFormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})

  const dialogRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) {
        onClose()
        return
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('input, select, button:not(:disabled)')
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
  }, [onClose, submitting])

  function handleChange<K extends keyof EmployeeFormValues>(field: K, value: EmployeeFormValues[K]) {
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    const validationErrors = validate(formValues)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length === 0) {
      onSubmit(formValues)
    }
  }

  const heading = mode === 'create' ? 'Add Employee' : 'Edit Employee'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out] motion-reduce:animate-none">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-form-heading"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl animate-[modalIn_0.2s_ease-out] motion-reduce:animate-none"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id="employee-form-heading" className="text-base font-semibold text-slate-800">
              {heading}
            </h2>
            {employeeId && <p className="mt-0.5 text-xs text-slate-400">Employee ID: {employeeId}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {submitError && (
              <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {submitError}
              </p>
            )}

            <section>
              <h3 className={sectionHeadingClass}>Basic information</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="employee-name" className={labelClass}>
                    Name
                  </label>
                  <input
                    id="employee-name"
                    ref={nameInputRef}
                    type="text"
                    value={formValues.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    disabled={submitting}
                    aria-describedby={errors.name ? 'employee-name-error' : undefined}
                    aria-invalid={errors.name ? true : undefined}
                    className={inputClass}
                  />
                  {errors.name && (
                    <p id="employee-name-error" role="alert" className={errorClass}>
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="employee-role" className={labelClass}>
                    Job Title
                  </label>
                  <input
                    id="employee-role"
                    type="text"
                    value={formValues.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    disabled={submitting}
                    aria-describedby={errors.role ? 'employee-role-error' : undefined}
                    aria-invalid={errors.role ? true : undefined}
                    className={inputClass}
                  />
                  {errors.role && (
                    <p id="employee-role-error" role="alert" className={errorClass}>
                      {errors.role}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-5">
              <h3 className={sectionHeadingClass}>Work information</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="employee-department" className={labelClass}>
                    Department
                  </label>
                  <select
                    id="employee-department"
                    value={formValues.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    disabled={submitting || !canChangeDepartment}
                    title={canChangeDepartment ? undefined : "Your role can't change an employee's department."}
                    className={inputClass}
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  {errors.department && (
                    <p role="alert" className={errorClass}>
                      {errors.department}
                    </p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="employee-joiningDate" className={labelClass}>
                    Joining date
                  </label>
                  <input
                    id="employee-joiningDate"
                    type="date"
                    value={formValues.joiningDate}
                    max={getTodayIso()}
                    onChange={(e) => handleChange('joiningDate', e.target.value)}
                    disabled={submitting}
                    aria-describedby={errors.joiningDate ? 'employee-joiningDate-error' : undefined}
                    aria-invalid={errors.joiningDate ? true : undefined}
                    className={inputClass}
                  />
                  {errors.joiningDate && (
                    <p id="employee-joiningDate-error" role="alert" className={errorClass}>
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
                  <label htmlFor="employee-email" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="employee-email"
                    type="email"
                    value={formValues.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    disabled={submitting}
                    aria-describedby={errors.email ? 'employee-email-error' : undefined}
                    aria-invalid={errors.email ? true : undefined}
                    className={inputClass}
                  />
                  {errors.email && (
                    <p id="employee-email-error" role="alert" className={errorClass}>
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="employee-phone" className={labelClass}>
                    Phone
                  </label>
                  <input
                    id="employee-phone"
                    type="tel"
                    value={formValues.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    disabled={submitting}
                    aria-describedby={errors.phone ? 'employee-phone-error' : undefined}
                    aria-invalid={errors.phone ? true : undefined}
                    className={inputClass}
                  />
                  {errors.phone && (
                    <p id="employee-phone-error" role="alert" className={errorClass}>
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="employee-location" className={labelClass}>
                    Location
                  </label>
                  <input
                    id="employee-location"
                    type="text"
                    value={formValues.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    disabled={submitting}
                    aria-describedby={errors.location ? 'employee-location-error' : undefined}
                    aria-invalid={errors.location ? true : undefined}
                    className={inputClass}
                  />
                  {errors.location && (
                    <p id="employee-location-error" role="alert" className={errorClass}>
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
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving…' : mode === 'create' ? 'Add Employee' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmployeeFormModal
