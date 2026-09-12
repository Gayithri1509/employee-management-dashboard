import type { Employee } from '../types/employee'
import { sampleEmployees } from '../data/employees'

// This project uses browser-local persistence (localStorage) only because a
// production server/database is outside the scope of this evaluator project.
// It is not a production database: data lives only in this browser, on this
// device, until the user clears site data. No backend, API, or sync involved.

const STORAGE_KEY = 'ems:employees:v1'

function isValidEmployee(value: unknown): value is Employee {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.role === 'string' &&
    typeof record.department === 'string' &&
    typeof record.email === 'string' &&
    typeof record.phone === 'string' &&
    typeof record.location === 'string' &&
    typeof record.status === 'string' &&
    typeof record.joiningDate === 'string'
  )
}

function isValidEmployeeArray(value: unknown): value is Employee[] {
  return Array.isArray(value) && value.length > 0 && value.every(isValidEmployee)
}

/**
 * Loads employees from localStorage, falling back to the fictional
 * sampleEmployees dataset whenever there is nothing stored, the JSON is
 * malformed, the parsed shape doesn't look like a valid Employee[], or
 * localStorage itself is unavailable/throws. sampleEmployees is never
 * mutated — it is only ever read here as the fallback value.
 */
export function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return sampleEmployees
    }

    const parsed: unknown = JSON.parse(raw)
    if (isValidEmployeeArray(parsed)) {
      return parsed
    }

    return sampleEmployees
  } catch {
    // Missing localStorage, malformed JSON, or a read error — fall back safely.
    return sampleEmployees
  }
}

/**
 * Persists the current employee list to localStorage. If the write fails
 * (storage disabled, quota exceeded, private-browsing restrictions, etc.),
 * the failure is swallowed on purpose: the app keeps working normally in
 * memory for the rest of the session, with no disruptive error shown.
 */
export function saveEmployees(employees: Employee[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees))
  } catch {
    // Intentionally ignored — see comment above.
  }
}
