import { describe, expect, it, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import { mapActivityLogRowToEntry, fetchActivityEntries } from './activityLogs'
import type { ActivityLogRow } from '../../types/database'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const from = vi.mocked(supabase.from)

beforeEach(() => {
  from.mockReset()
})

function makeRow(overrides: Partial<ActivityLogRow> = {}): ActivityLogRow {
  return {
    id: 'log-1',
    type: 'employee-update',
    actor_id: 'admin-1',
    target_employee_id: 'emp-1',
    message: 'Ada Lovelace was added to the system.',
    metadata: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('mapActivityLogRowToEntry', () => {
  it('maps a role-change row, containing the previous/new role in metadata, like any other supported type', () => {
    const row = makeRow({
      type: 'role-change',
      target_employee_id: null,
      message: "Akhila changed Sai Kumar's role from Employee to HR Staff.",
      metadata: { previous_role: 'employee', new_role: 'hr_staff', target_user_id: 'user-2', target_employee_id: null },
    })

    const result = mapActivityLogRowToEntry(row)

    expect(result).toEqual({
      id: 'log-1',
      type: 'role-change',
      message: "Akhila changed Sai Kumar's role from Employee to HR Staff.",
      timestamp: '2024-01-01T00:00:00Z',
      employeeId: undefined,
    })
  })

  it('still maps system and employee-update rows unchanged', () => {
    expect(mapActivityLogRowToEntry(makeRow({ type: 'system' }))?.type).toBe('system')
    expect(mapActivityLogRowToEntry(makeRow({ type: 'employee-update' }))?.type).toBe('employee-update')
  })

  it('still skips the unmodeled auth type', () => {
    expect(mapActivityLogRowToEntry(makeRow({ type: 'auth' }))).toBeNull()
  })
})

describe('fetchActivityEntries', () => {
  it('returns role-change entries alongside other types, newest first (as queried)', async () => {
    const rows: ActivityLogRow[] = [
      makeRow({ id: 'log-2', type: 'role-change', created_at: '2024-02-01T00:00:00Z' }),
      makeRow({ id: 'log-1', created_at: '2024-01-01T00:00:00Z' }),
    ]
    from.mockReturnValue({
      select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: rows, error: null }) }) }),
    } as never)

    const result = await fetchActivityEntries()

    expect(result.error).toBeNull()
    expect(result.data?.map((e) => e.id)).toEqual(['log-2', 'log-1'])
    expect(result.data?.[0].type).toBe('role-change')
  })
})
