import { useState, type FormEvent } from 'react'
import { Bell, Menu, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getInitials } from '../../utils/formatting'

interface TopHeaderProps {
  onOpenMobileNav: () => void
  displayName: string
  showOrgControls: boolean
  activityCount: number
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function TopHeader({ onOpenMobileNav, displayName, showOrgControls, activityCount }: TopHeaderProps) {
  const [quickSearch, setQuickSearch] = useState('')
  const navigate = useNavigate()

  function handleQuickSearchSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = quickSearch.trim()
    navigate(trimmed ? `/employees?q=${encodeURIComponent(trimmed)}` : '/employees')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
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
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
            {getGreeting()}{displayName ? `, ${displayName.split(' ')[0]}` : ''}
          </p>
          <h1 className="truncate text-lg font-semibold text-slate-900">Workforce overview</h1>
        </div>

        <div className="ml-auto flex items-center gap-3">
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
                  className="w-56 rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </form>

              <button
                type="button"
                onClick={() => navigate('/activity')}
                title={activityCount > 0 ? `${activityCount} recent activity entries` : 'No recent activity'}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <Bell className="h-4 w-4" />
                {activityCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-semibold text-white">
                    {activityCount > 9 ? '9+' : activityCount}
                  </span>
                )}
              </button>
            </>
          )}

          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
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
