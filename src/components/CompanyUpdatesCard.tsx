import { useNavigate } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import type { Announcement } from '../types/announcement'
import { getCompanyCommunications } from '../utils/companyCommunications'
import { AnnouncementPriorityBadge, AnnouncementTypeBadge } from './AnnouncementBadges'

interface CompanyUpdatesCardProps {
  announcements: Announcement[]
  canManageAnnouncements: boolean
}

const MAX_SHOWN = 3

/** Overview's compact "Company Updates" section -- see src/utils/companyCommunications.ts for how real, admin-published announcements and the baseline communication set combine into the list shown here. */
function CompanyUpdatesCard({ announcements, canManageAnnouncements }: CompanyUpdatesCardProps) {
  const navigate = useNavigate()
  const shown = getCompanyCommunications(announcements).slice(0, MAX_SHOWN)

  return (
    <div className="surface-elevated flex h-full flex-col p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/70 text-indigo-600 ring-1 ring-indigo-100">
            <Megaphone className="h-4 w-4" />
          </span>
          <h3 className="text-[15px] font-semibold text-slate-800">Company Updates</h3>
        </div>
        {canManageAnnouncements && (
          <button
            type="button"
            onClick={() => navigate('/communications')}
            className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            View all
          </button>
        )}
      </div>

      <div className="mt-4 flex-1">
        <ul className="space-y-3">
          {shown.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                <AnnouncementPriorityBadge priority={item.priority} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <AnnouncementTypeBadge type={item.type} />
                {item.dateLabel && <span className="text-[11px] text-slate-400">{item.dateLabel}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default CompanyUpdatesCard
