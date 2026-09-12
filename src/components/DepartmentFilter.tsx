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
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
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
