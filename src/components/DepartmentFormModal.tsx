import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

interface DepartmentFormModalProps {
  mode: 'create' | 'edit'
  initialName: string
  submitting: boolean
  submitError: string | null
  onSubmit: (name: string) => void
  onClose: () => void
}

function DepartmentFormModal({ mode, initialName, submitting, submitError, onSubmit, onClose }: DepartmentFormModalProps) {
  const [name, setName] = useState(initialName)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    const trimmed = name.trim()
    if (trimmed === '') {
      setValidationError('Department name is required.')
      return
    }

    setValidationError(null)
    onSubmit(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out] motion-reduce:animate-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="department-form-heading"
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl animate-[modalIn_0.2s_ease-out] motion-reduce:animate-none"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="department-form-heading" className="text-base font-semibold text-slate-800">
            {mode === 'create' ? 'Add Department' : 'Rename Department'}
          </h2>
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

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            {submitError && (
              <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {submitError}
              </p>
            )}
            <label htmlFor="department-name" className="mb-1 block text-xs font-medium text-slate-600">
              Department name
            </label>
            <input
              id="department-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              aria-invalid={validationError ? true : undefined}
              aria-describedby={validationError ? 'department-name-error' : undefined}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            {validationError && (
              <p id="department-name-error" role="alert" className="mt-1 text-xs text-red-600">
                {validationError}
              </p>
            )}
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
              {submitting ? 'Saving…' : mode === 'create' ? 'Add Department' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DepartmentFormModal
