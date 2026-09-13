import DepartmentFilter from './DepartmentFilter'
import StatusFilter from './StatusFilter'

interface FilterControlsProps {
  department: string
  status: string
  onDepartmentChange: (value: string) => void
  onStatusChange: (value: string) => void
  departments: string[]
}

function FilterControls({
  department,
  status,
  onDepartmentChange,
  onStatusChange,
  departments,
}: FilterControlsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <DepartmentFilter value={department} onChange={onDepartmentChange} departments={departments} />
      <StatusFilter value={status} onChange={onStatusChange} />
    </div>
  )
}

export default FilterControls
