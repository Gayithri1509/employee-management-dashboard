import { Megaphone, ShieldCheck, Sparkles, UserCog } from 'lucide-react'
import type { ActivityEntry } from '../types/activity'

interface ActivityLogEntryProps {
  entry: ActivityEntry
  isLast: boolean
}

const TYPE_META: Record<ActivityEntry['type'], { label: string; icon: typeof Sparkles; wrap: string; icon_color: string }> = {
  system: { label: 'System', icon: Sparkles, wrap: 'bg-slate-100 ring-1 ring-slate-200', icon_color: 'text-slate-500' },
  'employee-update': {
    label: 'Update',
    icon: UserCog,
    wrap: 'bg-gradient-to-br from-indigo-50 to-indigo-100/70 ring-1 ring-indigo-100',
    icon_color: 'text-indigo-600',
  },
  'role-change': {
    label: 'Role Change',
    icon: ShieldCheck,
    wrap: 'bg-gradient-to-br from-violet-50 to-violet-100/70 ring-1 ring-violet-100',
    icon_color: 'text-violet-600',
  },
  announcement: {
    label: 'Announcement',
    icon: Megaphone,
    wrap: 'bg-gradient-to-br from-sky-50 to-sky-100/70 ring-1 ring-sky-100',
    icon_color: 'text-sky-600',
  },
}

function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return isoTimestamp
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function ActivityLogEntry({ entry, isLast }: ActivityLogEntryProps) {
  const meta = TYPE_META[entry.type]
  const Icon = meta.icon

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-slate-200"
        />
      )}
      <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.wrap}`}>
        <Icon className={`h-3.5 w-3.5 ${meta.icon_color}`} />
      </span>
      <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
            {meta.label}
          </span>
          <span className="text-[11px] text-slate-400">{formatTimestamp(entry.timestamp)}</span>
        </div>
        <p className="mt-1.5 text-xs text-slate-700">{entry.message}</p>
      </div>
    </li>
  )
}

export default ActivityLogEntry
