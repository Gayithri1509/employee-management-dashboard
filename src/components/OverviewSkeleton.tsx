import Skeleton from './Skeleton'

/** Shapes the Overview page's loading state so the layout is recognizable before real data arrives, instead of a spinner over blank space. */
function OverviewSkeleton() {
  return (
    <div className="scroll-mt-20 space-y-6" role="status" aria-live="polite" aria-label="Loading dashboard">
      <Skeleton className="h-32 w-full rounded-2xl" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl lg:col-span-1" />
        <Skeleton className="h-64 rounded-2xl lg:col-span-1" />
        <Skeleton className="h-64 rounded-2xl lg:col-span-1" />
      </div>

      <Skeleton className="h-40 rounded-2xl" />
    </div>
  )
}

export default OverviewSkeleton
