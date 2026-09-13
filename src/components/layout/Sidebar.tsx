import { Activity, Building2, LayoutDashboard, LogOut, Settings, Sparkles, User, Users, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { ComponentType } from 'react'
import type { NavItem, RouteId } from '../../types/navigation'
import { getInitials } from '../../utils/formatting'

const NAV_ICONS: Record<RouteId, ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  employees: Users,
  departments: Building2,
  activity: Activity,
  insights: Sparkles,
  'my-profile': User,
  settings: Settings,
}

interface SidebarContentProps {
  navItems: NavItem[]
  displayName: string
  roleLabel: string
  onSignOut: () => void
  onNavigate?: () => void
}

function SidebarContent({ navItems, displayName, roleLabel, onSignOut, onNavigate }: SidebarContentProps) {
  return (
    <>
      <div className="flex items-center gap-2 px-5 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">EMS</p>
          <p className="text-[11px] text-slate-400">People Operations</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = NAV_ICONS[item.id]
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors duration-150 ${
                  isActive
                    ? 'border-indigo-400 bg-white/5 font-medium text-white'
                    : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {getInitials(displayName) || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{displayName}</p>
            <p className="text-[11px] text-slate-400">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}

interface SidebarProps {
  navItems: NavItem[]
  displayName: string
  roleLabel: string
  onSignOut: () => void
  isMobileOpen: boolean
  onCloseMobile: () => void
}

function Sidebar({ navItems, displayName, roleLabel, onSignOut, isMobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-white/5 lg:bg-slate-900">
        <SidebarContent navItems={navItems} displayName={displayName} roleLabel={roleLabel} onSignOut={onSignOut} />
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-slate-900/50 animate-[fadeIn_0.15s_ease-out] motion-reduce:animate-none"
          />
          <aside className="relative flex h-full w-72 max-w-[80vw] flex-col bg-slate-900 shadow-xl animate-[slideInLeft_0.2s_ease-out] motion-reduce:animate-none">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent
              navItems={navItems}
              displayName={displayName}
              roleLabel={roleLabel}
              onSignOut={onSignOut}
              onNavigate={onCloseMobile}
            />
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
