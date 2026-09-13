interface SkeletonProps {
  className?: string
}

/** A pulsing placeholder block -- used to shape loading states so a section reads as "about to appear" instead of a blank area. Respects prefers-reduced-motion via the global safety net in src/index.css. */
function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} aria-hidden="true" />
}

export default Skeleton
