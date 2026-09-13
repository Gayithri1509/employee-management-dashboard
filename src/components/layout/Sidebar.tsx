import { Activity, Building2, LayoutDashboard, LogOut, Megaphone, Settings, Sparkles, User, UserCog, Users, X } from 'lucide-react'
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
  communications: Megaphone,
  'my-profile': User,
  settings: Settings,
  users: UserCog,
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
      <div className="flex items-center gap-2.5 px-5 py-6">
        <span className="brand-wash flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_12px_-2px_rgba(79,70,229,0.5)]">
          <Building2 className="h-[18px] w-[18px]" />
        </span>
        <div>
          <p className="text-[15px] font-bold tracking-tight text-white">EMS</p>
          <p className="text-[11px] font-medium text-slate-500">People Operations</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const Icon = NAV_ICONS[item.id]
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-all duration-150 ${
                  isActive
                    ? 'bg-brand/15 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-brand/25'
                    : 'font-medium text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-400" aria-hidden="true" />
                  )}
                  <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white ring-1 ring-white/10">
            {getInitials(displayName) || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{displayName}</p>
            <p className="truncate text-[11px] font-medium text-indigo-300/80">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white"
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
      <aside className="relative hidden shadow-sidebar lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:bg-ink">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: 'radial-gradient(120% 60% at 0% 0%, rgba(79,70,229,0.16) 0%, transparent 55%)' }}
        />
        <div className="relative flex flex-1 flex-col">
          <SidebarContent navItems={navItems} displayName={displayName} roleLabel={roleLabel} onSignOut={onSignOut} />
        </div>
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] animate-[fadeIn_0.15s_ease-out] motion-reduce:animate-none"
          />
          <aside className="relative flex h-full w-72 max-w-[80vw] flex-col bg-ink shadow-2xl animate-[slideInLeft_0.2s_ease-out] motion-reduce:animate-none">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
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
