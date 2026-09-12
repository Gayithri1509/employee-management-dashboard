import type { ActivityEntry, ActivityType } from '../types/activity'

// Separate localStorage key from employees on purpose — the activity log is
// an independent data domain (see src/types/activity.ts) and must not be
// mixed into, or overwrite, the employee persistence key.
const STORAGE_KEY = 'ems:activity-log:v1'

const VALID_TYPES: ActivityType[] = ['system', 'employee-update']

function isValidActivityEntry(value: unknown): value is ActivityEntry {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string') return false
  if (typeof record.type !== 'string' || !VALID_TYPES.includes(record.type as ActivityType)) return false
  if (typeof record.message !== 'string') return false
  if (typeof record.timestamp !== 'string') return false
  if (record.employeeId !== undefined && typeof record.employeeId !== 'string') return false
  return true
}

function isValidActivityLogArray(value: unknown): value is ActivityEntry[] {
  // Unlike employees, an empty array is a legitimate activity log state
  // (e.g. right after falling back from corrupt data), so no length check.
  return Array.isArray(value) && value.every(isValidActivityEntry)
}

export function generateActivityId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID — still unique
  // enough for a client-side, non-security-sensitive log entry id.
  return `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createInitializationEntry(): ActivityEntry {
  return {
    id: generateActivityId(),
    type: 'system',
    message: 'Activity log initialized.',
    timestamp: new Date().toISOString(),
  }
}

/**
 * Loads the activity log from localStorage.
 *
 * - If the key has never been set at all (raw === null), this is a genuine
 *   first-ever visit: seed exactly one "Activity log initialized." system
 *   entry so the log is never empty on first load, without ever creating a
 *   duplicate on subsequent refreshes (the key exists after the first save).
 * - If the stored value is corrupt JSON or doesn't structurally look like an
 *   ActivityEntry[], fall back to an empty array — never fabricate employee
 *   history and never re-seed the initialization entry in this case.
 * - Any thrown error (e.g. localStorage unavailable) also falls back to [].
 */
export function loadActivityLog(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return [createInitializationEntry()]
    }

    const parsed: unknown = JSON.parse(raw)
    if (isValidActivityLogArray(parsed)) {
      return parsed
    }

    return []
  } catch {
    return []
  }
}

/**
 * Persists the current activity log to localStorage. Write failures are
 * swallowed on purpose, matching src/services/storage.ts: the dashboard and
 * its in-memory activity log keep working for the rest of the session even
 * if the browser can't persist.
 */
export function saveActivityLog(entries: ActivityEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Intentionally ignored — see comment above.
  }
}
