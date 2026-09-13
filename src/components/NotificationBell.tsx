import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Megaphone } from 'lucide-react'
import type { Announcement } from '../types/announcement'
import { getCompanyCommunications, type CommunicationItem } from '../utils/companyCommunications'
import { AnnouncementPriorityBadge, AnnouncementTypeBadge } from './AnnouncementBadges'

interface NotificationBellProps {
  announcements: Announcement[]
  readIds: Set<string>
  canManageAnnouncements: boolean
  onMarkRead: (announcementId: string) => void
  onMarkAllRead: () => void
}

/**
 * The application's notification center -- visible to every authenticated
 * role (unlike the org-wide "jump to Activity" shortcut, which stays admin/
 * hr-only). Shows the same combined communications list as the
 * Communications page and Overview's Company Updates card (see
 * src/utils/companyCommunications.ts). Read-state tracking only ever
 * applies to a real, admin-published announcement (item.isReal) -- a
 * baseline item's id does not exist in public.announcements, so attempting
 * to record a read for one would fail a real foreign-key constraint;
 * baseline items are simply never treated as "unread."
 */
function NotificationBell({ announcements, readIds, canManageAnnouncements, onMarkRead, onMarkAllRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const items = getCompanyCommunications(announcements)
  const unreadCount = items.filter((item) => item.isReal && !readIds.has(item.id)).length

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  function handleToggleItem(item: CommunicationItem) {
    const isExpanding = expandedId !== item.id
    setExpandedId(isExpanding ? item.id : null)
    if (isExpanding && item.isReal && !readIds.has(item.id)) {
      onMarkRead(item.id)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread company updates` : 'Company updates'}
        aria-expanded={open}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/[0.04]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">Company Updates</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Megaphone className="h-4 w-4" />
                </span>
                <p className="mt-3 text-xs text-slate-400">No company updates at the moment.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => {
                  const isUnread = item.isReal && !readIds.has(item.id)
                  const isExpanded = expandedId === item.id
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleToggleItem(item)}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${isUnread ? 'bg-indigo-50/40' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${isUnread ? 'bg-indigo-500' : 'bg-transparent'}`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                              <AnnouncementPriorityBadge priority={item.priority} />
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <AnnouncementTypeBadge type={item.type} />
                              {item.dateLabel && <span className="text-[11px] text-slate-400">{item.dateLabel}</span>}
                            </div>
                            {isExpanded && <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.message}</p>}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {canManageAnnouncements && (
            <div className="border-t border-slate-100 px-4 py-2.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/communications')
                }}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                Manage Company Communications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
