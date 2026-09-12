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
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
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
