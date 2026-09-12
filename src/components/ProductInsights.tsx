import { BrainCircuit, Compass, Sparkles } from 'lucide-react'

const INSIGHTS = [
  {
    icon: BrainCircuit,
    title: 'How this was built',
    body:
      "This dashboard was built iteratively with AI-assisted development: each capability — search, filtering, editing, persistence, and the activity log — was scoped, implemented, and verified in isolation before the next was added, with production build checks and real browser testing at every step.",
  },
  {
    icon: Compass,
    title: 'Why these choices',
    body:
      'A single-page architecture with plain component state was chosen deliberately: the data set and interaction model are small enough that a router or a global state library would add complexity without adding capability. Client-side persistence keeps the experience fast and dependency-free while remaining easy to swap for a real backend later.',
  },
  {
    icon: Sparkles,
    title: 'What makes it unique',
    body:
      "Smart Activity is the differentiator: rather than logging raw field diffs, it compares an employee's previous and updated record and writes a single, human-readable sentence — tailored wording for role, department, and status changes, and one combined entry when several fields change together — so the history reads like a real HR changelog, not a debug trace.",
  },
]

function ProductInsights() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-800">About EMS</h2>
        <p className="text-xs text-slate-400">The thinking behind this product</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {INSIGHTS.map((insight) => (
          <div key={insight.title} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <insight.icon className="h-4 w-4" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-slate-800">{insight.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{insight.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProductInsights
