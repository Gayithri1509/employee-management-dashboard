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
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">Quick Actions</h3>
      <p className="mt-0.5 text-xs text-slate-400">Jump to what you need</p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            className={
              action.primary
                ? 'flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500'
                : 'flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
            }
          >
            <action.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuickActions
