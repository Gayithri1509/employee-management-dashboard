import { describe, expect, it, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'
import {
  fetchAnnouncements,
  fetchMyReadAnnouncementIds,
  markAnnouncementRead,
  markAllAnnouncementsRead,
  createAnnouncement,
  updateAnnouncement,
  setAnnouncementStatus,
  deleteAnnouncement,
  type AnnouncementFormInput,
} from './announcements'
import type { AnnouncementRow } from '../../types/database'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

const from = vi.mocked(supabase.from)
const rpc = vi.mocked(supabase.rpc)

function makeRow(overrides: Partial<AnnouncementRow> = {}): AnnouncementRow {
  return {
    id: 'ann-1',
    title: 'Office closed Monday',
    message: 'The office will be closed for the public holiday.',
    type: 'holiday',
    priority: 'important',
    audience: 'everyone',
    status: 'published',
    publish_at: '2024-01-01T00:00:00Z',
    expires_at: null,
    event_date: '2024-01-08',
    created_by: 'admin-1',
    updated_by: 'admin-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

const formInput: AnnouncementFormInput = {
  title: 'Office closed Monday',
  message: 'The office will be closed for the public holiday.',
  type: 'holiday',
  priority: 'important',
  audience: 'everyone',
  publishAt: '2024-01-01T00:00:00Z',
  expiresAt: null,
  eventDate: '2024-01-08',
}

beforeEach(() => {
  from.mockReset()
  rpc.mockReset()
})

describe('fetchAnnouncements', () => {
  it('maps rows to the app Announcement shape', async () => {
    from.mockReturnValue({ select: () => ({ order: () => Promise.resolve({ data: [makeRow()], error: null }) }) } as never)

    const result = await fetchAnnouncements()

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      {
        id: 'ann-1',
        title: 'Office closed Monday',
        message: 'The office will be closed for the public holiday.',
        type: 'holiday',
        priority: 'important',
        audience: 'everyone',
        status: 'published',
        publishAt: '2024-01-01T00:00:00Z',
        expiresAt: null,
        eventDate: '2024-01-08',
        createdBy: 'admin-1',
        updatedBy: 'admin-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ])
  })

  it('returns a friendly error instead of a raw RLS/technical message', async () => {
    from.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'permission denied for table announcements' } }) }),
    } as never)

    const result = await fetchAnnouncements()

    expect(result.data).toBeNull()
    expect(result.error).toBe('Could not load company communications. Please try again.')
  })
})

describe('fetchMyReadAnnouncementIds', () => {
  it('returns a Set of the caller\'s own read announcement ids', async () => {
    from.mockReturnValue({
      select: () => Promise.resolve({ data: [{ announcement_id: 'ann-1' }, { announcement_id: 'ann-2' }], error: null }),
    } as never)

    const result = await fetchMyReadAnnouncementIds()

    expect(result.data).toEqual(new Set(['ann-1', 'ann-2']))
  })
})

describe('markAnnouncementRead / markAllAnnouncementsRead', () => {
  it('upserts exactly the caller\'s own profile_id -- never a different one', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    from.mockReturnValue({ upsert } as never)

    await markAnnouncementRead('ann-1', 'user-1')

    expect(upsert).toHaveBeenCalledWith(
      { announcement_id: 'ann-1', profile_id: 'user-1' },
      { onConflict: 'announcement_id,profile_id', ignoreDuplicates: true },
    )
  })

  it('marking all as read with nothing unread makes no request at all', async () => {
    const result = await markAllAnnouncementsRead([], 'user-1')

    expect(from).not.toHaveBeenCalled()
    expect(result.error).toBeNull()
  })

  it('marking all as read upserts one row per unread announcement, all for the caller only', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    from.mockReturnValue({ upsert } as never)

    await markAllAnnouncementsRead(['ann-1', 'ann-2'], 'user-1')

    expect(upsert).toHaveBeenCalledWith(
      [
        { announcement_id: 'ann-1', profile_id: 'user-1' },
        { announcement_id: 'ann-2', profile_id: 'user-1' },
      ],
      { onConflict: 'announcement_id,profile_id', ignoreDuplicates: true },
    )
  })
})

describe('mutation RPCs', () => {
  it('createAnnouncement calls create_announcement with the given status', async () => {
    rpc.mockResolvedValue({ data: makeRow(), error: null } as never)

    await createAnnouncement(formInput, 'draft')

    expect(rpc).toHaveBeenCalledWith('create_announcement', {
      p_title: formInput.title,
      p_message: formInput.message,
      p_type: formInput.type,
      p_priority: formInput.priority,
      p_audience: formInput.audience,
      p_publish_at: formInput.publishAt,
      p_expires_at: formInput.expiresAt,
      p_event_date: formInput.eventDate,
      p_status: 'draft',
    })
  })

  it('updateAnnouncement calls update_announcement and never changes status', async () => {
    rpc.mockResolvedValue({ data: makeRow(), error: null } as never)

    await updateAnnouncement('ann-1', formInput)

    expect(rpc).toHaveBeenCalledWith('update_announcement', {
      p_id: 'ann-1',
      p_title: formInput.title,
      p_message: formInput.message,
      p_type: formInput.type,
      p_priority: formInput.priority,
      p_audience: formInput.audience,
      p_publish_at: formInput.publishAt,
      p_expires_at: formInput.expiresAt,
      p_event_date: formInput.eventDate,
    })
  })

  it('setAnnouncementStatus calls set_announcement_status with the target status', async () => {
    rpc.mockResolvedValue({ data: makeRow({ status: 'archived' }), error: null } as never)

    await setAnnouncementStatus('ann-1', 'archived')

    expect(rpc).toHaveBeenCalledWith('set_announcement_status', { p_id: 'ann-1', p_status: 'archived' })
  })

  it('deleteAnnouncement calls delete_announcement and surfaces the server-side archive-first rule as a friendly message', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'A published announcement must be archived before it can be deleted.' } } as never)

    const result = await deleteAnnouncement('ann-1')

    expect(rpc).toHaveBeenCalledWith('delete_announcement', { p_id: 'ann-1' })
    expect(result.error).toBe('A published announcement must be archived before it can be deleted.')
  })
})
