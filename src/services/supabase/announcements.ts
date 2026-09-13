// Typed data-access module for Company Communications: reads (RLS-scoped --
// see supabase/migrations/0021_announcements.sql for exactly which rows a
// given role's SELECT can ever return) plus the Admin-only mutation RPCs.
// Mutations never touch the announcements table directly -- there is no
// client-facing INSERT/UPDATE/DELETE policy, by design, mirroring the
// employees table's pattern (0012/0013): every mutation goes through a
// SECURITY DEFINER RPC that enforces the admin-only rule server-side and
// writes its own activity_logs entry. created_by/updated_by and the audit
// trail are handled entirely by the database; nothing here ever fabricates
// an actor or forges an entry.

import { supabase } from '../../lib/supabase'
import type { AnnouncementRow } from '../../types/database'
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementType,
} from '../../types/announcement'
import { humanizeError } from '../../utils/errors'

export interface AnnouncementsResult {
  data: Announcement[] | null
  error: string | null
}

export interface AnnouncementResult {
  data: Announcement | null
  error: string | null
}

function mapRow(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    priority: row.priority,
    audience: row.audience,
    status: row.status,
    publishAt: row.publish_at,
    expiresAt: row.expires_at,
    eventDate: row.event_date,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Fetches announcements visible to the current caller. RLS alone decides
 * what comes back: a non-admin only ever receives published, currently-
 * in-window rows targeted at 'everyone' or their own role; Admin receives
 * every row (drafts, scheduled, archived included) for the management page.
 */
export async function fetchAnnouncements(): Promise<AnnouncementsResult> {
  const { data, error } = await supabase.from('announcements').select('*').order('publish_at', { ascending: false })

  if (error) {
    return { data: null, error: humanizeError(error.message, 'Could not load company communications. Please try again.') }
  }

  return { data: (data ?? []).map(mapRow), error: null }
}

/** Fetches the ids of announcements the current caller has already read. RLS scopes this to their own read markers only. */
export async function fetchMyReadAnnouncementIds(): Promise<{ data: Set<string> | null; error: string | null }> {
  const { data, error } = await supabase.from('announcement_reads').select('announcement_id')

  if (error) {
    return { data: null, error: humanizeError(error.message, 'Could not load your notification state.') }
  }

  return { data: new Set((data ?? []).map((row) => row.announcement_id)), error: null }
}

/**
 * Marks one announcement as read for the current caller. Upserts so
 * re-marking an already-read announcement is a harmless no-op rather than
 * a unique-violation error. profile_id is always the caller's own auth.uid()
 * -- the announcement_reads_insert policy (0021) rejects anything else, so
 * this can never mark another user's notification state.
 */
export async function markAnnouncementRead(announcementId: string, profileId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('announcement_reads')
    .upsert({ announcement_id: announcementId, profile_id: profileId }, { onConflict: 'announcement_id,profile_id', ignoreDuplicates: true })

  if (error) {
    return { error: humanizeError(error.message, 'Could not update your notification state.') }
  }

  return { error: null }
}

/** Marks every given announcement as read for the current caller in one request. */
export async function markAllAnnouncementsRead(announcementIds: string[], profileId: string): Promise<{ error: string | null }> {
  if (announcementIds.length === 0) {
    return { error: null }
  }

  const { error } = await supabase
    .from('announcement_reads')
    .upsert(
      announcementIds.map((announcementId) => ({ announcement_id: announcementId, profile_id: profileId })),
      { onConflict: 'announcement_id,profile_id', ignoreDuplicates: true },
    )

  if (error) {
    return { error: humanizeError(error.message, 'Could not update your notification state.') }
  }

  return { error: null }
}

export interface AnnouncementFormInput {
  title: string
  message: string
  type: AnnouncementType
  priority: AnnouncementPriority
  audience: AnnouncementAudience
  publishAt: string
  expiresAt: string | null
  eventDate: string | null
}

/** Creates an announcement via create_announcement. Admin only (enforced server-side). */
export async function createAnnouncement(input: AnnouncementFormInput, status: AnnouncementStatus): Promise<AnnouncementResult> {
  const { data, error } = await supabase.rpc('create_announcement', {
    p_title: input.title,
    p_message: input.message,
    p_type: input.type,
    p_priority: input.priority,
    p_audience: input.audience,
    p_publish_at: input.publishAt,
    p_expires_at: input.expiresAt,
    p_event_date: input.eventDate,
    p_status: status,
  })

  if (error) {
    return { data: null, error: humanizeError(error.message, 'Could not create this announcement. Please try again.') }
  }

  return { data: data ? mapRow(data) : null, error: null }
}

/** Edits an announcement's content/targeting/scheduling via update_announcement. Admin only (enforced server-side). Does not change status. */
export async function updateAnnouncement(id: string, input: AnnouncementFormInput): Promise<AnnouncementResult> {
  const { data, error } = await supabase.rpc('update_announcement', {
    p_id: id,
    p_title: input.title,
    p_message: input.message,
    p_type: input.type,
    p_priority: input.priority,
    p_audience: input.audience,
    p_publish_at: input.publishAt,
    p_expires_at: input.expiresAt,
    p_event_date: input.eventDate,
  })

  if (error) {
    return { data: null, error: humanizeError(error.message, 'Could not save changes to this announcement. Please try again.') }
  }

  return { data: data ? mapRow(data) : null, error: null }
}

/** Publishes/archives/unpublishes an announcement via set_announcement_status. Admin only (enforced server-side). */
export async function setAnnouncementStatus(id: string, status: AnnouncementStatus): Promise<AnnouncementResult> {
  const { data, error } = await supabase.rpc('set_announcement_status', { p_id: id, p_status: status })

  if (error) {
    return { data: null, error: humanizeError(error.message, 'Could not update this announcement. Please try again.') }
  }

  return { data: data ? mapRow(data) : null, error: null }
}

/** Permanently deletes a draft or archived announcement via delete_announcement. Admin only; a published announcement must be archived first (enforced server-side). */
export async function deleteAnnouncement(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_announcement', { p_id: id })

  if (error) {
    return { error: humanizeError(error.message, 'Could not delete this announcement. Please try again.') }
  }

  return { error: null }
}
