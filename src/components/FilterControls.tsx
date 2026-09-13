import DepartmentFilter from './DepartmentFilter'
import StatusFilter from './StatusFilter'
import SortControl from './SortControl'
import type { SortOption } from '../utils/employeeSort'

interface FilterControlsProps {
  department: string
  status: string
  sortBy: SortOption
  onDepartmentChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSortChange: (value: SortOption) => void
  departments: string[]
}

function FilterControls({
  department,
  status,
  sortBy,
  onDepartmentChange,
  onStatusChange,
  onSortChange,
  departments,
}: FilterControlsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <DepartmentFilter value={department} onChange={onDepartmentChange} departments={departments} />
      <StatusFilter value={status} onChange={onStatusChange} />
      <SortControl value={sortBy} onChange={onSortChange} />
    </div>
  )
}

export default FilterControls
