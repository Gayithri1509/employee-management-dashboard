import { describe, expect, it } from 'vitest'
import { buildDepartmentNameById } from './departments'
import type { DepartmentRow } from '../../types/database'

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
