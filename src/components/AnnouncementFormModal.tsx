import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_PRIORITY_LABELS,
  ANNOUNCEMENT_TYPES,
  ANNOUNCEMENT_TYPE_LABELS,
  type AnnouncementAudience,
  type AnnouncementPriority,
  type AnnouncementType,
} from '../types/announcement'
import type { AnnouncementFormInput } from '../services/supabase/announcements'

interface AnnouncementFormModalProps {
  submitting: boolean
  submitError: string | null
  onSubmit: (input: AnnouncementFormInput) => void
  onClose: () => void
}

/** Admin-only: publishes a new company announcement via the real create_announcement RPC (supabase/migrations/0021) -- no local-only or simulated persistence. */
function AnnouncementFormModal({ submitting, submitError, onSubmit, onClose }: AnnouncementFormModalProps) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<AnnouncementType>('general')
  const [priority, setPriority] = useState<AnnouncementPriority>('normal')
  const [audience, setAudience] = useState<AnnouncementAudience>('everyone')
  const [validationError, setValidationError] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    const trimmedTitle = title.trim()
    const trimmedMessage = message.trim()

    if (trimmedTitle === '') {
      setValidationError('Title is required.')
      return
    }
    if (trimmedMessage === '') {
      setValidationError('Message is required.')
      return
    }

    setValidationError(null)
    onSubmit({
      title: trimmedTitle,
      message: trimmedMessage,
      type,
      priority,
      audience,
      publishAt: new Date().toISOString(),
      expiresAt: null,
      eventDate: null,
    })
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50'
  const labelClass = 'mb-1 block text-xs font-medium text-slate-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out] motion-reduce:animate-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-form-heading"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl animate-[modalIn_0.2s_ease-out] motion-reduce:animate-none"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="announcement-form-heading" className="text-base font-semibold text-slate-800">
            New Announcement
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {(submitError || validationError) && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {submitError ?? validationError}
              </p>
            )}

            <div>
              <label htmlFor="announcement-title" className={labelClass}>
                Title
              </label>
              <input
                id="announcement-title"
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                maxLength={120}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="announcement-message" className={labelClass}>
                Message
              </label>
              <textarea
                id="announcement-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={submitting}
                rows={4}
                maxLength={1000}
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="announcement-type" className={labelClass}>
                  Category
                </label>
                <select
                  id="announcement-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as AnnouncementType)}
                  disabled={submitting}
                  className={fieldClass}
                >
                  {ANNOUNCEMENT_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {ANNOUNCEMENT_TYPE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="announcement-priority" className={labelClass}>
                  Priority
                </label>
                <select
                  id="announcement-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                  disabled={submitting}
                  className={fieldClass}
                >
                  {ANNOUNCEMENT_PRIORITIES.map((value) => (
                    <option key={value} value={value}>
                      {ANNOUNCEMENT_PRIORITY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="announcement-audience" className={labelClass}>
                Audience
              </label>
              <select
                id="announcement-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
                disabled={submitting}
                className={fieldClass}
              >
                {ANNOUNCEMENT_AUDIENCES.map((value) => (
                  <option key={value} value={value}>
                    {ANNOUNCEMENT_AUDIENCE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
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
              {submitting ? 'Publishing…' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AnnouncementFormModal
