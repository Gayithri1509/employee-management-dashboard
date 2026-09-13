import { describe, expect, it, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import { fetchLinkableProfiles, linkEmployeeProfile, unlinkEmployeeProfile } from './employeeLinking'

vi.mock('../../lib/supabase', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}))

const rpc = vi.mocked(supabase.rpc)
const from = vi.mocked(supabase.from)

beforeEach(() => {
  rpc.mockReset()
  from.mockReset()
})

describe('fetchLinkableProfiles', () => {
  it('maps list_linkable_profiles rows to the app shape', async () => {
    rpc.mockResolvedValueOnce({
      data: [{ id: 'user-2', full_name: 'Sai Kumar', email: 'sai@example.com' }],
      error: null,
    } as never)

    const result = await fetchLinkableProfiles()

    expect(rpc).toHaveBeenCalledWith('list_linkable_profiles')
    expect(result.data).toEqual([{ id: 'user-2', fullName: 'Sai Kumar', email: 'sai@example.com' }])
  })

  it('surfaces a non-admin/hr_manager rejection as a friendly error', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Only Admin or HR Manager can view linkable accounts.' },
    } as never)

    const result = await fetchLinkableProfiles()

    expect(result.data).toBeNull()
    expect(result.error).toBe('Only Admin or HR Manager can view linkable accounts.')
  })
})

describe('linkEmployeeProfile', () => {
  it('calls link_employee_profile with the employee id and target profile id', async () => {
    rpc.mockResolvedValueOnce({ data: { id: 'emp-1' }, error: null } as never)

    const result = await linkEmployeeProfile('emp-1', 'user-2')

    expect(rpc).toHaveBeenCalledWith('link_employee_profile', {
      p_employee_id: 'emp-1',
      p_target_profile_id: 'user-2',
    })
    expect(result.error).toBeNull()
  })

  it('surfaces a self-link rejection (an employee attempting to link themselves)', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Only Admin or HR Manager can link an employee to a user account.' },
    } as never)

    const result = await linkEmployeeProfile('emp-1', 'user-1')

    expect(result.error).toBe('Only Admin or HR Manager can link an employee to a user account.')
  })

  it('surfaces a "profile already linked to a different employee" conflict', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'This user account is already linked to a different employee record.' },
    } as never)

    const result = await linkEmployeeProfile('emp-1', 'user-2')

    expect(result.error).toBe('This user account is already linked to a different employee record.')
  })

  it('surfaces an "employee already linked" conflict', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'This employee is already linked to a different user account.' },
    } as never)

    const result = await linkEmployeeProfile('emp-1', 'user-3')

    expect(result.error).toBe('This employee is already linked to a different user account.')
  })

  it('surfaces an invalid target rejection', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'User not found.' } } as never)

    const result = await linkEmployeeProfile('emp-1', 'does-not-exist')

    expect(result.error).toBe('User not found.')
  })

  it('never touches any table directly -- linking is entirely inside the RPC', async () => {
    rpc.mockResolvedValueOnce({ data: { id: 'emp-1' }, error: null } as never)

    await linkEmployeeProfile('emp-1', 'user-2')

    expect(from).not.toHaveBeenCalled()
  })
})

describe('unlinkEmployeeProfile', () => {
  it('calls unlink_employee_profile with the employee id', async () => {
    rpc.mockResolvedValueOnce({ data: { id: 'emp-1' }, error: null } as never)

    const result = await unlinkEmployeeProfile('emp-1')

    expect(rpc).toHaveBeenCalledWith('unlink_employee_profile', { p_employee_id: 'emp-1' })
    expect(result.error).toBeNull()
  })

  it('surfaces a non-admin/hr_manager rejection', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Only Admin or HR Manager can unlink an employee from a user account.' },
    } as never)

    const result = await unlinkEmployeeProfile('emp-1')

    expect(result.error).toBe('Only Admin or HR Manager can unlink an employee from a user account.')
  })

  it('surfaces a "not linked" rejection', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'This employee is not linked to a user account.' },
    } as never)

    const result = await unlinkEmployeeProfile('emp-1')

    expect(result.error).toBe('This employee is not linked to a user account.')
  })
})
