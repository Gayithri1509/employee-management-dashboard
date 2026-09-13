import { useState, type FormEvent } from 'react'
import { Activity, Menu, Search } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Announcement } from '../../types/announcement'
import { getInitials } from '../../utils/formatting'
import NotificationBell from '../NotificationBell'

interface TopHeaderProps {
  onOpenMobileNav: () => void
  displayName: string
  showOrgControls: boolean
  activityCount: number
  announcements: Announcement[]
  readAnnouncementIds: Set<string>
  canManageAnnouncements: boolean
  onMarkAnnouncementRead: (announcementId: string) => void
  onMarkAllAnnouncementsRead: () => void
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/employees': 'Employees',
  '/departments': 'Departments',
  '/activity': 'Activity',
  '/insights': 'Insights',
  '/communications': 'Company Communications',
  '/my-profile': 'My Profile',
  '/settings': 'Settings',
  '/users': 'User & Access',
}

const TODAY_LABEL = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

function TopHeader({
  onOpenMobileNav,
  displayName,
  showOrgControls,
  activityCount,
  announcements,
  readAnnouncementIds,
  canManageAnnouncements,
  onMarkAnnouncementRead,
  onMarkAllAnnouncementsRead,
}: TopHeaderProps) {
  const [quickSearch, setQuickSearch] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Dashboard'

  function handleQuickSearchSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = quickSearch.trim()
    navigate(trimmed ? `/employees?q=${encodeURIComponent(trimmed)}` : '/employees')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md" style={{ boxShadow: '0 1px 0 rgba(15,23,42,0.04), 0 8px 24px -20px rgba(15,23,42,0.25)' }}>
      <div className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <p className="hidden text-[11px] font-semibold uppercase tracking-wider text-brand sm:block">{TODAY_LABEL}</p>
          <h1 className="truncate text-[22px] font-bold tracking-tight text-slate-900">{pageTitle}</h1>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          {showOrgControls && (
            <>
              <form onSubmit={handleQuickSearchSubmit} className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <label htmlFor="global-search" className="sr-only">
                  Search employees
                </label>
                <input
                  id="global-search"
                  type="search"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Search people..."
                  className="w-56 rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition-all focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
                />
              </form>

              <button
                type="button"
                onClick={() => navigate('/activity')}
                title={activityCount > 0 ? `${activityCount} recent activity entries` : 'No recent activity'}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <Activity className="h-4 w-4" />
                {activityCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-semibold text-white ring-2 ring-white">
                    {activityCount > 9 ? '9+' : activityCount}
                  </span>
                )}
              </button>
            </>
          )}

          <NotificationBell
            announcements={announcements}
            readIds={readAnnouncementIds}
            canManageAnnouncements={canManageAnnouncements}
            onMarkRead={onMarkAnnouncementRead}
            onMarkAllRead={onMarkAllAnnouncementsRead}
          />

          <span className="h-6 w-px bg-slate-200" aria-hidden="true" />

          <span
            className="brand-wash flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-[0_2px_8px_-2px_rgba(79,70,229,0.5)]"
            title={displayName}
          >
            {getInitials(displayName) || '?'}
          </span>
        </div>
      </div>
    </header>
  )
}

export default TopHeader
