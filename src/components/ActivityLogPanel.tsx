import { History } from 'lucide-react'
import type { ActivityEntry } from '../types/activity'
import ActivityLogEntry from './ActivityLogEntry'
import EmptyState from './EmptyState'

interface ActivityLogPanelProps {
  entries: ActivityEntry[]
}

function ActivityLogPanel({ entries }: ActivityLogPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
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
          <ul>
            {entries.map((entry, index) => (
              <ActivityLogEntry key={entry.id} entry={entry} isLast={index === entries.length - 1} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default ActivityLogPanel
