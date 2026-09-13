import { describe, expect, it, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import {
  fetchDepartments,
  buildDepartmentNameById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  countEmployeesInDepartment,
  reassignDepartmentEmployees,
} from './departments'
import type { DepartmentRow } from '../../types/database'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

const from = vi.mocked(supabase.from)
const rpc = vi.mocked(supabase.rpc)

beforeEach(() => {
  from.mockReset()
  rpc.mockReset()
})

describe('fetchDepartments', () => {
  it('returns departments ordered by name on success', async () => {
    const rows: DepartmentRow[] = [{ id: 'dept-1', name: 'Engineering', created_at: '2024-01-01T00:00:00Z' }]
    from.mockReturnValue({ select: () => ({ order: () => Promise.resolve({ data: rows, error: null }) }) } as never)

    const result = await fetchDepartments()

    expect(result.data).toEqual(rows)
    expect(result.error).toBeNull()
  })

  it('returns a friendly error on failure instead of a raw technical message', async () => {
    from.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'permission denied for table departments' } }) }),
    } as never)

    const result = await fetchDepartments()

    expect(result.data).toBeNull()
    expect(result.error).toBe('Could not load departments. Please try again.')
  })
})

describe('buildDepartmentNameById', () => {
  it('maps each department id to its name', () => {
    const departments: DepartmentRow[] = [
      { id: 'dept-1', name: 'Engineering', created_at: '2024-01-01T00:00:00Z' },
      { id: 'dept-2', name: 'Design', created_at: '2024-01-01T00:00:00Z' },
    ]

    expect(buildDepartmentNameById(departments)).toEqual({
      'dept-1': 'Engineering',
      'dept-2': 'Design',
    })
  })

  it('returns an empty object for an empty list', () => {
    expect(buildDepartmentNameById([])).toEqual({})
  })
})

const sampleDept: DepartmentRow = { id: 'dept-1', name: 'Engineering', created_at: '2024-01-01T00:00:00Z' }

describe('createDepartment', () => {
  it('returns the created department on success', async () => {
    from.mockReturnValue({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: sampleDept, error: null }) }) }),
    } as never)

    const result = await createDepartment('Engineering')

    expect(result.data).toEqual(sampleDept)
    expect(result.error).toBeNull()
  })

  it('maps a unique-constraint violation to a friendly duplicate-name error', async () => {
    from.mockReturnValue({
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key' } }) }),
      }),
    } as never)

    const result = await createDepartment('Engineering')

    expect(result.data).toBeNull()
    expect(result.error).toBe('A department with this name already exists.')
  })
})

describe('updateDepartment', () => {
  it('returns the renamed department on success', async () => {
    from.mockReturnValue({
      update: () => ({
        eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { ...sampleDept, name: 'Platform' }, error: null }) }) }),
      }),
    } as never)

    const result = await updateDepartment('dept-1', 'Platform')

    expect(result.data?.name).toBe('Platform')
  })

  it('maps a unique-constraint violation to a friendly duplicate-name error', async () => {
    from.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({ single: () => Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key' } }) }),
        }),
      }),
    } as never)

    const result = await updateDepartment('dept-1', 'Design')

    expect(result.error).toBe('A department with this name already exists.')
  })
})

describe('deleteDepartment', () => {
  it('reports no error on success', async () => {
    from.mockReturnValue({ delete: () => ({ eq: () => Promise.resolve({ error: null }) }) } as never)

    const result = await deleteDepartment('dept-1')

    expect(result.error).toBeNull()
  })

  it('maps a foreign-key violation to a friendly "still has employees" error', async () => {
    from.mockReturnValue({
      delete: () => ({ eq: () => Promise.resolve({ error: { code: '23503', message: 'violates foreign key' } }) }),
    } as never)

    const result = await deleteDepartment('dept-1')

    expect(result.error).toBe('This department still has employees assigned to it.')
  })
})

describe('countEmployeesInDepartment', () => {
  it('returns the employee count for a department', async () => {
    from.mockReturnValue({ select: () => ({ eq: () => Promise.resolve({ count: 5, error: null }) }) } as never)

    const result = await countEmployeesInDepartment('dept-1')

    expect(result.count).toBe(5)
    expect(result.error).toBeNull()
  })
})

describe('reassignDepartmentEmployees', () => {
  it('calls the reassign_department_employees RPC with both department ids', async () => {
    rpc.mockResolvedValueOnce({ data: 3, error: null } as never)

    const result = await reassignDepartmentEmployees('dept-1', 'dept-2')

    expect(rpc).toHaveBeenCalledWith('reassign_department_employees', {
      p_from_department_id: 'dept-1',
      p_to_department_id: 'dept-2',
    })
    expect(result.count).toBe(3)
  })
})
