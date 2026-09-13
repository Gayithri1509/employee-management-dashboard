import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { AlertTriangle, Calendar, CheckCircle2, Gift, Megaphone, PlusCircle, Sparkles, Users } from 'lucide-react'
import { useAppOutletContext } from '../layouts/appOutletContext'
import { createAnnouncement, type AnnouncementFormInput } from '../services/supabase/announcements'
import { getCompanyCommunications, type CommunicationItem } from '../utils/companyCommunications'
import type { AnnouncementType } from '../types/announcement'
import { AnnouncementPriorityBadge, AnnouncementStatusBadge, AnnouncementTypeBadge } from '../components/AnnouncementBadges'
import AnnouncementFormModal from '../components/AnnouncementFormModal'

const CATEGORY_ICON: Record<AnnouncementType, ComponentType<{ className?: string }>> = {
  company_event: Calendar,
  important: AlertTriangle,
  holiday: Gift,
  hr_information: Users,
  motivation: Sparkles,
  general: Megaphone,
  policy: Megaphone,
  appreciation: Sparkles,
}

const CATEGORY_ACCENT: Record<AnnouncementType, string> = {
  company_event: 'bg-violet-500',
  important: 'bg-amber-500',
  holiday: 'bg-sky-500',
  hr_information: 'bg-indigo-500',
  motivation: 'bg-emerald-500',
  general: 'bg-slate-400',
  policy: 'bg-slate-400',
  appreciation: 'bg-emerald-500',
}

const CATEGORY_ICON_WRAP: Record<AnnouncementType, string> = {
  company_event: 'bg-gradient-to-br from-violet-50 to-violet-100/70 text-violet-600 ring-1 ring-violet-100',
  important: 'bg-gradient-to-br from-amber-50 to-amber-100/70 text-amber-600 ring-1 ring-amber-100',
  holiday: 'bg-gradient-to-br from-sky-50 to-sky-100/70 text-sky-600 ring-1 ring-sky-100',
  hr_information: 'bg-gradient-to-br from-indigo-50 to-indigo-100/70 text-indigo-600 ring-1 ring-indigo-100',
  motivation: 'bg-gradient-to-br from-emerald-50 to-emerald-100/70 text-emerald-600 ring-1 ring-emerald-100',
  general: 'bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-600 ring-1 ring-slate-200',
  policy: 'bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-600 ring-1 ring-slate-200',
  appreciation: 'bg-gradient-to-br from-emerald-50 to-emerald-100/70 text-emerald-600 ring-1 ring-emerald-100',
}

function CommunicationCard({ item }: { item: CommunicationItem }) {
  const Icon = CATEGORY_ICON[item.type]
  return (
    <div className="surface-floating relative overflow-hidden p-5">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${CATEGORY_ACCENT[item.type]}`} />
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${CATEGORY_ICON_WRAP[item.type]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <AnnouncementTypeBadge type={item.type} />
            <AnnouncementPriorityBadge priority={item.priority} />
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold text-slate-800">{item.title}</h3>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.message}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <span>{item.audience}</span>
          {item.dateLabel && <span>{item.dateLabel}</span>}
        </div>
        <AnnouncementStatusBadge status="published" />
      </div>
    </div>
  )
}

function CommunicationsPage() {
  const { announcements, capabilities, refreshAnnouncements, showToast } = useAppOutletContext()

  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const items = useMemo(() => getCompanyCommunications(announcements), [announcements])
  const [featured, ...rest] = items

  const stats = useMemo(() => {
    const total = items.length
    const published = items.filter((item) => item.isPublished).length
    const important = items.filter((item) => item.priority === 'important' || item.priority === 'urgent').length
    return { total, published, scheduled: 0, important }
  }, [items])

  async function handleCreate(input: AnnouncementFormInput) {
    setSubmitting(true)
    setSubmitError(null)

    const result = await createAnnouncement(input, 'published')
    setSubmitting(false)

    if (result.error) {
      setSubmitError(result.error)
      return
    }

    setFormOpen(false)
    showToast('Announcement published.')
    void refreshAnnouncements()
  }

  return (
    <div className="scroll-mt-20 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Keep your workforce informed, aligned and connected.</p>
        {capabilities.canManageAnnouncements && (
          <button
            type="button"
            onClick={() => {
              setSubmitError(null)
              setFormOpen(true)
            }}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <PlusCircle className="h-4 w-4" />
            New Announcement
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="surface-floating p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100/70 text-indigo-600 ring-1 ring-indigo-100">
              <Megaphone className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{stats.total}</p>
        </div>
        <div className="surface-floating p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/70 text-emerald-600 ring-1 ring-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Published</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{stats.published}</p>
        </div>
        <div className="surface-floating p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-50 to-sky-100/70 text-sky-600 ring-1 ring-sky-100">
              <Calendar className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Scheduled</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{stats.scheduled}</p>
        </div>
        <div className="surface-floating p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/70 text-amber-600 ring-1 ring-amber-100">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Important</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{stats.important}</p>
        </div>
      </div>

      {featured && (
        <div className="surface-elevated relative overflow-hidden p-6">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(closest-side, var(--color-brand), transparent)' }}
          />
          <div className="relative flex items-start gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${CATEGORY_ICON_WRAP[featured.type]}`}>
              {(() => {
                const FeaturedIcon = CATEGORY_ICON[featured.type]
                return <FeaturedIcon className="h-5 w-5" />
              })()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <AnnouncementTypeBadge type={featured.type} />
                <AnnouncementPriorityBadge priority={featured.priority} />
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{featured.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{featured.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span>Audience: {featured.audience}</span>
                {featured.dateLabel && <span>{featured.dateLabel}</span>}
                <AnnouncementStatusBadge status="published" />
              </div>
            </div>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <h2 className="mb-3 text-[15px] font-semibold text-slate-800">Latest Communications</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {rest.map((item) => (
              <CommunicationCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {formOpen && (
        <AnnouncementFormModal
          submitting={submitting}
          submitError={submitError}
          onSubmit={(input) => void handleCreate(input)}
          onClose={() => {
            if (submitting) return
            setFormOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default CommunicationsPage
