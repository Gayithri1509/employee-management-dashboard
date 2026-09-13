// Company Communications domain types. Kept in its own file, mirroring
// src/types/employee.ts and src/types/activity.ts, because this is a
// distinct data domain -- not because every type needs a file.

export type AnnouncementType =
  | 'general'
  | 'important'
  | 'holiday'
  | 'company_event'
  | 'hr_information'
  | 'policy'
  | 'appreciation'
  | 'motivation'

export type AnnouncementPriority = 'normal' | 'important' | 'urgent'

export type AnnouncementStatus = 'draft' | 'published' | 'archived'

export type AnnouncementAudience = 'everyone' | 'employee' | 'hr_staff' | 'hr_manager' | 'admin'

export const ANNOUNCEMENT_TYPES: AnnouncementType[] = [
  'general',
  'important',
  'holiday',
  'company_event',
  'hr_information',
  'policy',
  'appreciation',
  'motivation',
]

export const ANNOUNCEMENT_PRIORITIES: AnnouncementPriority[] = ['normal', 'important', 'urgent']

export const ANNOUNCEMENT_STATUSES: AnnouncementStatus[] = ['draft', 'published', 'archived']

export const ANNOUNCEMENT_AUDIENCES: AnnouncementAudience[] = ['everyone', 'employee', 'hr_staff', 'hr_manager', 'admin']

export interface Announcement {
  id: string
  title: string
  message: string
  type: AnnouncementType
  priority: AnnouncementPriority
  audience: AnnouncementAudience
  status: AnnouncementStatus
  publishAt: string
  expiresAt: string | null
  eventDate: string | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export const ANNOUNCEMENT_TYPE_LABELS: Record<AnnouncementType, string> = {
  general: 'General',
  important: 'Important',
  holiday: 'Holiday',
  company_event: 'Company Event',
  hr_information: 'HR Information',
  policy: 'Policy',
  appreciation: 'Appreciation',
  motivation: 'Motivation',
}

export const ANNOUNCEMENT_PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  normal: 'Normal',
  important: 'Important',
  urgent: 'Urgent',
}

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  everyone: 'Everyone',
  employee: 'Employees',
  hr_staff: 'HR Staff',
  hr_manager: 'HR Managers',
  admin: 'Admins',
}
