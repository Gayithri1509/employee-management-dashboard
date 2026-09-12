// Small, genuinely shared display helpers used by multiple employee-facing
// components (card, spotlight). Kept here rather than duplicated, per the
// project's convention of only extracting a utils module when there is a
// real multi-consumer need.
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function formatJoiningDate(isoDate: string): string {
  const [year, month] = isoDate.split('-')
  const monthIndex = Number(month) - 1
  return `${MONTH_NAMES[monthIndex]} ${year}`
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`
  return initials.toUpperCase()
}
