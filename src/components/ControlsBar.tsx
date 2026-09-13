import SearchBar from './SearchBar'
import FilterControls from './FilterControls'
import type { SortOption } from '../utils/employeeSort'

interface ControlsBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  department: string
  status: string
  sortBy: SortOption
  onDepartmentChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSortChange: (value: SortOption) => void
  departments: string[]
}

function ControlsBar({
  searchTerm,
  onSearchChange,
  department,
  status,
  sortBy,
  onDepartmentChange,
  onStatusChange,
  onSortChange,
  departments,
}: ControlsBarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <SearchBar value={searchTerm} onChange={onSearchChange} />
      <FilterControls
        department={department}
        status={status}
        sortBy={sortBy}
        onDepartmentChange={onDepartmentChange}
        onStatusChange={onStatusChange}
        onSortChange={onSortChange}
        departments={departments}
      />
    </div>
  )
}

export default ControlsBar
