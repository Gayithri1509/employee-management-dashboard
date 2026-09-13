import { ShieldCheck, History, Building2 } from 'lucide-react'

const INSIGHTS = [
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    body:
      'Access is enforced role by role -- Admin, HR Manager, HR Staff, and Employee each see and can change only what their role permits, backed by database-level authorization rather than the interface alone.',
  },
  {
    icon: Building2,
    title: 'Always up to date',
    body:
      'The directory, departments, and dashboards read live organizational data, so every teammate sees the same accurate picture the moment a change is made.',
  },
  {
    icon: History,
    title: 'Audit-ready history',
    body:
      "Every employee change is recorded automatically in a human-readable timeline -- who changed what and when -- so your workforce history stays trustworthy without any manual logging.",
  },
]

function ProductInsights() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-800">About EMS</h2>
        <p className="text-xs text-slate-400">What powers your workforce platform</p>
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
