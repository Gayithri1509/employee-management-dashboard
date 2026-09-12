import SearchBar from './SearchBar'
import FilterControls from './FilterControls'

interface ControlsBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  department: string
  status: string
  onDepartmentChange: (value: string) => void
  onStatusChange: (value: string) => void
}

function ControlsBar({
  searchTerm,
  onSearchChange,
  department,
  status,
  onDepartmentChange,
  onStatusChange,
}: ControlsBarProps) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <SearchBar value={searchTerm} onChange={onSearchChange} />
      <FilterControls
        department={department}
        status={status}
        onDepartmentChange={onDepartmentChange}
        onStatusChange={onStatusChange}
      />
    </div>
  )
}

export default ControlsBar
