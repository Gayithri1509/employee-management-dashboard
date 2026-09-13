import StatusDonut from '../charts/StatusDonut'

interface WorkforcePulseProps {
  active: number
  onLeave: number
  inactive: number
  total: number
}

function WorkforcePulse({ active, onLeave, inactive, total }: WorkforcePulseProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <h3 className="text-sm font-semibold text-slate-800">Workforce Health</h3>
      <p className="mt-0.5 text-xs text-slate-400">Current status distribution across your team</p>

      <div className="mt-5 flex flex-1 items-center">
        <StatusDonut active={active} onLeave={onLeave} inactive={inactive} total={total} />
      </div>
    </div>
  )
}

export default WorkforcePulse
