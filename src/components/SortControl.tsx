import { SORT_OPTIONS, SORT_OPTION_LABELS, type SortOption } from '../utils/employeeSort'

interface SortControlProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

function SortControl({ value, onChange }: SortControlProps) {
  return (
    <div>
      <label htmlFor="sort-control" className="sr-only">
        Sort employees
      </label>
      <select
        id="sort-control"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        aria-label="Sort employees"
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_OPTION_LABELS[option]}
          </option>
        ))}
      </select>
    </div>
  )
}

export default SortControl
