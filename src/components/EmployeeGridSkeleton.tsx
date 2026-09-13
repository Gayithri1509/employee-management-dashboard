import Skeleton from './Skeleton'

/** Shapes the Employees page's loading state as directory chrome + a card grid, instead of a spinner over blank space. */
function EmployeeGridSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6" role="status" aria-live="polite" aria-label="Loading employees">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export default EmployeeGridSkeleton
