import type { ActivityEntry } from '../types/activity'

interface ActivityLogEntryProps {
  entry: ActivityEntry
}

// Plain text type label — intentionally no icon library (Phase 9 forbids
// adding one); this stays presentational and just maps the union type to a
// short human-readable word.
const TYPE_LABELS: Record<ActivityEntry['type'], string> = {
  system: 'System',
  'employee-update': 'Update',
}

function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return isoTimestamp
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function ActivityLogEntry({ entry }: ActivityLogEntryProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 text-xs last:border-b-0">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500">
          {TYPE_LABELS[entry.type]}
        </span>
        <span className="text-slate-700">{entry.message}</span>
      </div>
      <span className="shrink-0 text-slate-400">{formatTimestamp(entry.timestamp)}</span>
    </div>
  )
}

export default ActivityLogEntry
