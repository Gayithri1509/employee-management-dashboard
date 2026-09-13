import { Activity, Building2, PlusCircle, Sparkles, UserCog, Users } from 'lucide-react'
import type { ComponentType } from 'react'

interface QuickActionsProps {
  canCreateEmployee: boolean
  canManageDepartments: boolean
  canManageRoles: boolean
  onAddEmployee: () => void
  onViewEmployees: () => void
  onViewDepartments: () => void
  onViewUsers: () => void
  onViewActivity: () => void
  onViewInsights: () => void
}

interface ActionButton {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
  onClick: () => void
  primary?: boolean
}

function QuickActions({
  canCreateEmployee,
  canManageDepartments,
  canManageRoles,
  onAddEmployee,
  onViewEmployees,
  onViewDepartments,
  onViewUsers,
  onViewActivity,
  onViewInsights,
}: QuickActionsProps) {
  const actions: ActionButton[] = []

  if (canCreateEmployee) {
    actions.push({ key: 'add-employee', label: 'Add Employee', icon: PlusCircle, onClick: onAddEmployee, primary: true })
  }
  actions.push({ key: 'employees', label: 'Manage Employees', icon: Users, onClick: onViewEmployees })
  if (canManageDepartments) {
    actions.push({ key: 'departments', label: 'Manage Departments', icon: Building2, onClick: onViewDepartments })
  }
  if (canManageRoles) {
    actions.push({ key: 'users', label: 'User & Access', icon: UserCog, onClick: onViewUsers })
  }
  actions.push({ key: 'activity', label: 'Activity', icon: Activity, onClick: onViewActivity })
  actions.push({ key: 'insights', label: 'Insights', icon: Sparkles, onClick: onViewInsights })

  return (
    <div className="surface p-5">
      <h3 className="text-[15px] font-semibold text-slate-800">Quick Actions</h3>
      <p className="mt-0.5 text-xs text-slate-400">Jump to what you need</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            className={
              action.primary
                ? 'brand-wash flex flex-col items-start gap-2.5 rounded-xl px-3.5 py-3 text-left text-white shadow-[0_4px_12px_-4px_rgba(79,70,229,0.5)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_-4px_rgba(79,70,229,0.55)] motion-reduce:hover:translate-y-0'
                : 'flex flex-col items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md motion-reduce:hover:translate-y-0'
            }
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${action.primary ? 'bg-white/15 text-white' : 'bg-indigo-50 text-indigo-600'}`}
            >
              <action.icon className="h-4 w-4 shrink-0" />
            </span>
            <span className={`text-xs font-semibold leading-tight ${action.primary ? 'text-white' : 'text-slate-700'}`}>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuickActions
