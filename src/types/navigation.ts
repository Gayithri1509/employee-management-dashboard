// Section identifiers for the single-page application shell. Navigation is
// implemented as in-page anchor scrolling driven by component state — no
// React Router — per the project's locked single-page architecture.
export type SectionId = 'overview' | 'employees' | 'activity' | 'insights'

export interface NavItem {
  id: SectionId
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'employees', label: 'Employees' },
  { id: 'activity', label: 'Activity' },
  { id: 'insights', label: 'Insights' },
]
