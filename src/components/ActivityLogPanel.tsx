import type { ActivityEntry } from '../types/activity'
import ActivityLogEntry from './ActivityLogEntry'

interface ActivityLogPanelProps {
  entries: ActivityEntry[]
}

// Presentational only: Dashboard owns and orders the activity log (newest
// first, via prepending in handleSaveEmployee); this component just renders
// whatever list it's given, plus an empty-state message.
function ActivityLogPanel({ entries }: ActivityLogPanelProps) {
  return (
    <section className="mx-6 my-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Activity Log</h2>
      {entries.length === 0 ? (
        <p className="mt-1 text-xs text-slate-400">No activity yet.</p>
      ) : (
        <div className="mt-3">
          {entries.map((entry) => (
            <ActivityLogEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  )
}

export default ActivityLogPanel
