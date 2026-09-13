// Activity log domain types for Phase 9's Smart Global System Activity Log.
// Kept in its own file (mirroring src/types/employee.ts) because this is a
// distinct data domain from Employee, not because every type needs a file.

export type ActivityType = 'system' | 'employee-update' | 'role-change' | 'announcement'

export interface ActivityEntry {
  id: string
  type: ActivityType
  message: string
  timestamp: string
  employeeId?: string
}
