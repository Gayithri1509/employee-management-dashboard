// Combines real, admin-published announcements (supabase/migrations/0021,
// already RLS-scoped to the viewer) with the always-available baseline
// content (src/data/companyCommunications.ts) into one display shape, so
// every surface that shows "company communications" (the Communications
// page, the Overview card, the notification bell) reads from a single
// source of truth. Real announcements are shown first when any exist --
// the baseline set never overrides or hides them -- and the baseline set
// fills the rest so the product never shows an empty state while it has
// real content to offer.
import type { Announcement } from '../types/announcement'
import { BASELINE_COMMUNICATIONS, type BaselineCommunication } from '../data/companyCommunications'

export interface CommunicationItem {
  id: string
  title: string
  message: string
  type: BaselineCommunication['type']
  priority: BaselineCommunication['priority']
  audience: string
  dateLabel?: string
  isPublished: boolean
  /** True only for a row that really exists in public.announcements -- read-state tracking (announcement_reads has a real FK to announcements.id) must never be attempted for a baseline item, since its id does not exist in that table. */
  isReal: boolean
}

function fromAnnouncement(announcement: Announcement): CommunicationItem {
  return {
    id: announcement.id,
    title: announcement.title,
    message: announcement.message,
    type: announcement.type,
    priority: announcement.priority,
    audience: announcement.audience === 'everyone' ? 'Everyone' : announcement.audience.replace('_', ' '),
    dateLabel: announcement.eventDate
      ? new Date(announcement.eventDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
      : undefined,
    isPublished: true,
    isReal: true,
  }
}

function fromBaseline(item: BaselineCommunication): CommunicationItem {
  return { ...item, isPublished: true, isReal: false }
}

/** The combined, ready-to-display list -- real announcements first, baseline content filling the rest. */
export function getCompanyCommunications(realAnnouncements: Announcement[]): CommunicationItem[] {
  return [...realAnnouncements.map(fromAnnouncement), ...BASELINE_COMMUNICATIONS.map(fromBaseline)]
}
