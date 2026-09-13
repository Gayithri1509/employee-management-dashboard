import { describe, expect, it } from 'vitest'
import { mapEmployeeRowToEmployee } from './employees'
import type { EmployeeRow } from '../../types/database'

const departmentNameById = { 'dept-1': 'Engineering' }

function makeRow(overrides: Partial<EmployeeRow> = {}): EmployeeRow {
  return {
    id: 'emp-1',
    name: 'Ada Lovelace',
    role: 'Engineer',
    department_id: 'dept-1',
    email: 'ada@example.com',
    phone: '+1 555-0100',
    location: 'Remote',
    status: 'Active',
    joining_date: '2020-01-01',
    profile_id: null,
    created_by: null,
    updated_by: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('mapEmployeeRowToEmployee', () => {
  it('maps a valid row to the app Employee shape', () => {
    const result = mapEmployeeRowToEmployee(makeRow(), departmentNameById)

    expect(result).toEqual({
      id: 'emp-1',
      name: 'Ada Lovelace',
      role: 'Engineer',
      department: 'Engineering',
      email: 'ada@example.com',
      phone: '+1 555-0100',
      location: 'Remote',
      status: 'Active',
      joiningDate: '2020-01-01',
    })
  })

  it('defaults null phone/location to empty strings', () => {
    const result = mapEmployeeRowToEmployee(makeRow({ phone: null, location: null }), departmentNameById)

    expect(result?.phone).toBe('')
    expect(result?.location).toBe('')
  })

  it('returns null when the department_id has no matching department', () => {
    const result = mapEmployeeRowToEmployee(makeRow({ department_id: 'unknown-dept' }), departmentNameById)

    expect(result).toBeNull()
  })

  it('returns null when the status is not a recognized value', () => {
    const result = mapEmployeeRowToEmployee(
      makeRow({ status: 'Retired' as EmployeeRow['status'] }),
      departmentNameById,
    )

    expect(result).toBeNull()
  })
})
