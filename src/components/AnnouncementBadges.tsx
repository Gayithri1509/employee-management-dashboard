import { AlertTriangle, Info } from 'lucide-react'
import type { AnnouncementPriority, AnnouncementStatus, AnnouncementType } from '../types/announcement'
import { ANNOUNCEMENT_PRIORITY_LABELS, ANNOUNCEMENT_TYPE_LABELS } from '../types/announcement'

const TYPE_STYLES: Record<AnnouncementType, string> = {
  general: 'bg-slate-100 text-slate-600',
  important: 'bg-amber-50 text-amber-700',
  holiday: 'bg-sky-50 text-sky-700',
  company_event: 'bg-violet-50 text-violet-700',
  hr_information: 'bg-indigo-50 text-indigo-700',
  policy: 'bg-slate-100 text-slate-600',
  appreciation: 'bg-emerald-50 text-emerald-700',
  motivation: 'bg-emerald-50 text-emerald-700',
}

/** A quiet type label -- color alone never carries the meaning, the text always does. */
export function AnnouncementTypeBadge({ type }: { type: AnnouncementType }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_STYLES[type]}`}>
      {ANNOUNCEMENT_TYPE_LABELS[type]}
    </span>
  )
}

/**
 * Priority is the one place this feature is allowed real visual weight, and
 * only for 'urgent' -- per the brief, priority should drive prominence, not
 * every announcement being loud. Color is always paired with an icon and
 * text label, never color alone.
 */
export function AnnouncementPriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  if (priority === 'normal') {
    return null
  }

  if (priority === 'urgent') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
        <AlertTriangle className="h-3 w-3" />
        Urgent
      </span>
    )
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      <Info className="h-3 w-3" />
      {ANNOUNCEMENT_PRIORITY_LABELS[priority]}
    </span>
  )
}

const STATUS_STYLES: Record<AnnouncementStatus, { badge: string; dot: string; label: string }> = {
  draft: { badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400', label: 'Draft' },
  published: { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Published' },
  archived: { badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400', label: 'Archived' },
}

export function AnnouncementStatusBadge({ status, scheduled }: { status: AnnouncementStatus; scheduled?: boolean }) {
  const styles = STATUS_STYLES[status]
  const label = status === 'published' && scheduled ? 'Scheduled' : styles.label
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${styles.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {label}
    </span>
  )
}
