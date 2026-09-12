import AIUsagePanel from './AIUsagePanel'
import LogicalApproachPanel from './LogicalApproachPanel'
import DesignJustificationPanel from './DesignJustificationPanel'

function EvaluatorSection() {
  return (
    <section className="mx-6 my-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      <AIUsagePanel />
      <LogicalApproachPanel />
      <DesignJustificationPanel />
    </section>
  )
}

export default EvaluatorSection
