import { describe, expect, it, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import { fetchUsersForAdmin, setUserRole } from './users'

vi.mock('../../lib/supabase', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}))

const rpc = vi.mocked(supabase.rpc)
const from = vi.mocked(supabase.from)

beforeEach(() => {
  rpc.mockReset()
  from.mockReset()
})

describe('fetchUsersForAdmin', () => {
  it('maps list_profiles_for_admin rows to the app AdminUser shape', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'user-1',
          full_name: 'Sai Kumar',
          email: 'sai@example.com',
          role: 'employee',
          created_at: '2024-01-01T00:00:00Z',
          last_sign_in_at: '2024-06-01T12:00:00Z',
        },
      ],
      error: null,
    } as never)

    const result = await fetchUsersForAdmin()

    expect(rpc).toHaveBeenCalledWith('list_profiles_for_admin')
    expect(result.data).toEqual([
      {
        id: 'user-1',
        fullName: 'Sai Kumar',
        email: 'sai@example.com',
        role: 'employee',
        createdAt: '2024-01-01T00:00:00Z',
        lastSignInAt: '2024-06-01T12:00:00Z',
      },
    ])
  })

  it('surfaces a non-admin rejection as a friendly error', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Only Admin can view the user list.' } } as never)

    const result = await fetchUsersForAdmin()

    expect(result.data).toBeNull()
    expect(result.error).toBe('Only Admin can view the user list.')
  })
})

describe('setUserRole', () => {
  it('admin changing another user\'s role: calls set_user_role with the target id and new role', async () => {
    rpc.mockResolvedValueOnce({
      data: { id: 'user-2', full_name: 'Priya', role: 'hr_manager', created_at: 't', updated_at: 't' },
      error: null,
    } as never)

    const result = await setUserRole('user-2', 'hr_manager')

    expect(rpc).toHaveBeenCalledWith('set_user_role', { p_user_id: 'user-2', p_role: 'hr_manager' })
    expect(result.error).toBeNull()
  })

  it('non-admin cannot change roles: surfaces the server-side rejection', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "Only Admin can change a user's role." } } as never)

    const result = await setUserRole('user-2', 'admin')

    expect(result.error).toBe("Only Admin can change a user's role.")
  })

  it('a user cannot change their own role: surfaces the server-side rejection', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'You cannot change your own role.' } } as never)

    const result = await setUserRole('self-id', 'admin')

    expect(result.error).toBe('You cannot change your own role.')
  })

  it('the last remaining Admin cannot be demoted: surfaces the server-side rejection', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Cannot change this role: at least one Admin must remain.' },
    } as never)

    const result = await setUserRole('only-admin-id', 'employee')

    expect(result.error).toBe('Cannot change this role: at least one Admin must remain.')
  })

  it('an invalid/non-existent target user is rejected', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'User not found.' } } as never)

    const result = await setUserRole('does-not-exist', 'employee')

    expect(result.error).toBe('User not found.')
  })

  it('never touches activity_logs (or any table) directly -- the role-change audit entry is written entirely inside set_user_role', async () => {
    rpc.mockResolvedValueOnce({
      data: { id: 'user-2', full_name: 'Priya', role: 'hr_manager', created_at: 't', updated_at: 't' },
      error: null,
    } as never)

    await setUserRole('user-2', 'hr_manager')

    expect(from).not.toHaveBeenCalled()
  })
})
