import Skeleton from './Skeleton'

/** Shapes the Insights page's loading state to match its real composition, so charts never flash in as broken/empty containers. */
function InsightsSkeleton() {
  return (
    <div className="scroll-mt-20 space-y-6" role="status" aria-live="polite" aria-label="Loading workforce insights">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-2xl lg:col-span-3" />
      </div>

      <Skeleton className="h-72 rounded-2xl" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default InsightsSkeleton
