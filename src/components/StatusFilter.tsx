import { EMPLOYEE_STATUSES } from '../types/employee'

interface StatusFilterProps {
  value: string
  onChange: (value: string) => void
}

function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div>
      <label htmlFor="status-filter" className="sr-only">
        Filter by status
      </label>
      <select
        id="status-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filter by status"
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        <option value="all">All Statuses</option>
        {EMPLOYEE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  )
}

export default StatusFilter
