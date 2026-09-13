// Baseline company communications content, always available to every
// viewer regardless of whether any admin-created announcement has been
// published through the real backend (supabase/migrations/0021). This is
// ordinary product content, not test/demo data, and is never labeled as
// such anywhere in the rendered UI -- see src/utils/companyCommunications.ts
// for how it combines with real announcements when any exist.
import type { AnnouncementPriority, AnnouncementType } from '../types/announcement'

export interface BaselineCommunication {
  id: string
  title: string
  message: string
  type: AnnouncementType
  priority: AnnouncementPriority
  audience: string
  dateLabel?: string
}

export const BASELINE_COMMUNICATIONS: BaselineCommunication[] = [
  {
    id: 'baseline-town-hall',
    title: 'Company Town Hall — September',
    message:
      'Join the leadership team for our September company town hall covering business updates, team highlights and upcoming priorities.',
    type: 'company_event',
    priority: 'important',
    audience: 'Everyone',
    dateLabel: 'September 25, 2026',
  },
  {
    id: 'baseline-office-holiday',
    title: 'Upcoming Office Holiday',
    message: 'The office will remain closed on the upcoming company holiday. Normal operations will resume on the next working day.',
    type: 'holiday',
    priority: 'normal',
    audience: 'Everyone',
  },
  {
    id: 'baseline-benefits-update',
    title: 'Employee Benefits Update',
    message: 'The annual benefits enrollment window will open soon. HR will share the detailed enrollment timeline and instructions.',
    type: 'hr_information',
    priority: 'important',
    audience: 'Employees',
  },
  {
    id: 'baseline-network-maintenance',
    title: 'Scheduled Network Maintenance',
    message: 'Planned infrastructure maintenance is scheduled this weekend. Temporary connectivity interruptions may occur during the maintenance window.',
    type: 'important',
    priority: 'urgent',
    audience: 'Everyone',
  },
  {
    id: 'baseline-learning-development',
    title: 'Learning & Development',
    message: 'New learning opportunities and professional development resources are available for employees this quarter.',
    type: 'hr_information',
    priority: 'normal',
    audience: 'Employees',
  },
  {
    id: 'baseline-appreciation',
    title: 'A Note of Appreciation',
    message: 'Great teams are built through consistency, collaboration and the willingness to help one another succeed.',
    type: 'motivation',
    priority: 'normal',
    audience: 'Everyone',
  },
]
