interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="w-full sm:w-64">
      <label htmlFor="employee-search" className="sr-only">
        Search employees
      </label>
      <input
        id="employee-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name, role, department, or email"
        aria-label="Search employees"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
      />
    </div>
  )
}

export default SearchBar
