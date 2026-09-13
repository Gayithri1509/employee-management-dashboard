import { useAppOutletContext } from '../layouts/appOutletContext'
import ActivityLogPanel from '../components/ActivityLogPanel'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

function ActivityPage() {
  const { activityEntries, loading, activityError, retryActivity } = useAppOutletContext()

  if (loading) {
    return <LoadingState message="Loading activity…" />
  }

  if (activityError) {
    return <ErrorState message={activityError} onRetry={() => void retryActivity()} />
  }

  return (
    <div className="scroll-mt-20">
      <ActivityLogPanel entries={activityEntries} />
    </div>
  )
}

export default ActivityPage
