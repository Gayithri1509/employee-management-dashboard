import { Activity, Building2, LayoutDashboard, Settings, Sparkles, Users, X } from 'lucide-react'
import { NAV_ITEMS, type SectionId } from '../../types/navigation'

const NAV_ICONS: Record<SectionId, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  employees: Users,
  activity: Activity,
  insights: Sparkles,
}

interface SidebarContentProps {
  activeSection: SectionId
  onNavigate: (id: SectionId) => void
}

function SidebarContent({ activeSection, onNavigate }: SidebarContentProps) {
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
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.id]
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors duration-150 ${
                isActive
                  ? 'border-indigo-400 bg-white/5 font-medium text-white'
                  : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}

        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Settings is coming soon"
          className="flex w-full cursor-not-allowed items-center justify-between rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm text-slate-600"
        >
          <span className="flex items-center gap-3">
            <Settings className="h-4 w-4" />
            Settings
          </span>
          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
            Soon
          </span>
        </button>
      </nav>

      <div className="border-t border-white/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            HR
          </span>
          <div>
            <p className="text-xs font-medium text-white">HR Admin</p>
            <p className="text-[11px] text-slate-400">Workspace admin</p>
          </div>
        </div>
      </div>
    </>
  )
}

interface SidebarProps {
  activeSection: SectionId
  onNavigate: (id: SectionId) => void
  isMobileOpen: boolean
  onCloseMobile: () => void
}

function Sidebar({ activeSection, onNavigate, isMobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-white/5 lg:bg-slate-900">
        <SidebarContent activeSection={activeSection} onNavigate={onNavigate} />
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
              activeSection={activeSection}
              onNavigate={(id) => {
                onNavigate(id)
                onCloseMobile()
              }}
            />
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
