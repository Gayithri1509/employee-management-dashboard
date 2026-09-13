import { History } from 'lucide-react'
import type { ActivityEntry } from '../types/activity'
import ActivityLogEntry from './ActivityLogEntry'
import EmptyState from './EmptyState'

interface ActivityLogPanelProps {
  entries: ActivityEntry[]
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dayLabel(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return 'Earlier'

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

interface EntryGroup {
  label: string
  entries: ActivityEntry[]
}

/** Groups already-newest-first entries by calendar day, preserving order -- a pure presentation grouping, never a re-derivation of the underlying audit data. */
function groupByDay(entries: ActivityEntry[]): EntryGroup[] {
  const groups: EntryGroup[] = []

  for (const entry of entries) {
    const label = dayLabel(entry.timestamp)
    const currentGroup = groups[groups.length - 1]
    if (currentGroup && currentGroup.label === label) {
      currentGroup.entries.push(entry)
    } else {
      groups.push({ label, entries: [entry] })
    }
  }

  return groups
}

function ActivityLogPanel({ entries }: ActivityLogPanelProps) {
  const groups = groupByDay(entries)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md ring-1 ring-slate-900/[0.04] sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <History className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Smart Activity</h2>
          <p className="text-xs text-slate-400">A live, automatically generated record of workforce changes</p>
        </div>
      </div>

      <div className="mt-5">
        {entries.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity yet"
            description="Updates to your team will appear here automatically."
          />
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                <ul>
                  {group.entries.map((entry, index) => (
                    <ActivityLogEntry key={entry.id} entry={entry} isLast={index === group.entries.length - 1} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLogPanel
