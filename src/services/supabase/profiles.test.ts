import { describe, expect, it, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import { fetchProfileById, updateMyFullName } from './profiles'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

const from = vi.mocked(supabase.from)
const rpc = vi.mocked(supabase.rpc)

beforeEach(() => {
  from.mockReset()
  rpc.mockReset()
})

describe('fetchProfileById', () => {
  it('returns the profile row on success', async () => {
    const row = { id: 'user-1', full_name: 'Ada Lovelace', role: 'admin', created_at: 't', updated_at: 't' }
    from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }) }),
    } as never)

    const result = await fetchProfileById('user-1')

    expect(result.data).toEqual(row)
    expect(result.error).toBeNull()
  })
})

describe('updateMyFullName', () => {
  it('calls update_my_profile with only the new name -- no id or role parameter', async () => {
    rpc.mockResolvedValueOnce({
      data: { id: 'user-1', full_name: 'New Name', role: 'admin', created_at: 't', updated_at: 't' },
      error: null,
    } as never)

    await updateMyFullName('New Name')

    expect(rpc).toHaveBeenCalledWith('update_my_profile', { p_full_name: 'New Name' })
    const [, args] = rpc.mock.calls[0]
    expect(args).not.toHaveProperty('p_id')
    expect(args).not.toHaveProperty('p_role')
  })

  it('surfaces an RPC error as a friendly message', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Profile not found.' } } as never)

    const result = await updateMyFullName('New Name')

    expect(result.data).toBeNull()
    expect(result.error).toBe('Profile not found.')
  })
})
