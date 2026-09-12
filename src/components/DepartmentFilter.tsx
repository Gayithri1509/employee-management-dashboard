import { DEPARTMENTS } from '../types/employee'

interface DepartmentFilterProps {
  value: string
  onChange: (value: string) => void
}

function DepartmentFilter({ value, onChange }: DepartmentFilterProps) {
  return (
    <div>
      <label htmlFor="department-filter" className="sr-only">
        Filter by department
      </label>
      <select
        id="department-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filter by department"
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        <option value="all">All Departments</option>
        {DEPARTMENTS.map((department) => (
          <option key={department} value={department}>
            {department}
          </option>
        ))}
      </select>
    </div>
  )
}

export default DepartmentFilter
