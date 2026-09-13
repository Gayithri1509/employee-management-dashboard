import { describe, expect, it, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import {
  mapEmployeeRowToEmployee,
  createEmployee,
  updateEmployee,
  setEmployeeStatus,
  deleteEmployee,
  updateEmployeeSelf,
} from './employees'
import type { EmployeeRow } from '../../types/database'

vi.mock('../../lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}))

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

const rpc = vi.mocked(supabase.rpc)

beforeEach(() => {
  rpc.mockReset()
})

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

const formInput = {
  name: 'Ada Lovelace',
  role: 'Engineer',
  departmentId: 'dept-1',
  email: 'ada@example.com',
  phone: '+1 555-0100',
  location: 'Remote',
  joiningDate: '2020-01-01',
}

describe('createEmployee', () => {
  it('calls the create_employee RPC and maps the returned row', async () => {
    rpc.mockResolvedValueOnce({ data: makeRow(), error: null } as never)

    const result = await createEmployee(formInput, departmentNameById)

    expect(rpc).toHaveBeenCalledWith('create_employee', {
      p_name: 'Ada Lovelace',
      p_role: 'Engineer',
      p_department_id: 'dept-1',
      p_email: 'ada@example.com',
      p_phone: '+1 555-0100',
      p_location: 'Remote',
      p_joining_date: '2020-01-01',
    })
    expect(result.error).toBeNull()
    expect(result.data?.name).toBe('Ada Lovelace')
  })

  it('surfaces a duplicate-email error from the RPC without throwing', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'An employee with this email already exists.' },
    } as never)

    const result = await createEmployee(formInput, departmentNameById)

    expect(result.data).toBeNull()
    expect(result.error).toBe('An employee with this email already exists.')
  })
})

describe('updateEmployee', () => {
  it('calls the update_employee RPC with the employee id and mapped fields', async () => {
    rpc.mockResolvedValueOnce({ data: makeRow({ role: 'Staff Engineer' }), error: null } as never)

    const result = await updateEmployee('emp-1', { ...formInput, role: 'Staff Engineer' }, departmentNameById)

    expect(rpc).toHaveBeenCalledWith(
      'update_employee',
      expect.objectContaining({ p_id: 'emp-1', p_role: 'Staff Engineer' }),
    )
    expect(result.data?.role).toBe('Staff Engineer')
  })

  it('surfaces a hr_staff department-change rejection from the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "insufficient_privilege: hr_staff cannot change an employee's department" },
    } as never)

    const result = await updateEmployee('emp-1', formInput, departmentNameById)

    expect(result.data).toBeNull()
    expect(result.error).toMatch(/hr_staff cannot change/)
  })
})

describe('setEmployeeStatus', () => {
  it('calls set_employee_status with the target status', async () => {
    rpc.mockResolvedValueOnce({ data: makeRow({ status: 'Inactive' }), error: null } as never)

    const result = await setEmployeeStatus('emp-1', 'Inactive', departmentNameById)

    expect(rpc).toHaveBeenCalledWith('set_employee_status', { p_id: 'emp-1', p_status: 'Inactive' })
    expect(result.data?.status).toBe('Inactive')
  })
})

describe('deleteEmployee', () => {
  it('calls delete_employee and reports no error on success', async () => {
    rpc.mockResolvedValueOnce({ data: makeRow(), error: null } as never)

    const result = await deleteEmployee('emp-1')

    expect(rpc).toHaveBeenCalledWith('delete_employee', { p_id: 'emp-1' })
    expect(result.error).toBeNull()
  })

  it('surfaces an admin-only rejection from the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'insufficient_privilege: only admin may delete employees' },
    } as never)

    const result = await deleteEmployee('emp-1')

    expect(result.error).toMatch(/only admin/)
  })
})

describe('updateEmployeeSelf', () => {
  it('sends only phone/location, with no employee id parameter', async () => {
    rpc.mockResolvedValueOnce({ data: makeRow({ phone: '+1 555-9999' }), error: null } as never)

    await updateEmployeeSelf({ phone: '+1 555-9999', location: 'Remote' }, departmentNameById)

    const [rpcName, args] = rpc.mock.calls[0]
    expect(rpcName).toBe('update_employee_self')
    expect(args).toEqual({ p_phone: '+1 555-9999', p_location: 'Remote' })
    expect(args).not.toHaveProperty('p_id')
  })
})
