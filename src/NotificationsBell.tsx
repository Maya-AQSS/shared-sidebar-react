import { useEffect, useRef, useState } from 'react'
import { useNotifications, type UseNotificationsOptions } from './useNotifications'

export interface NotificationsBellProps extends UseNotificationsOptions {
  /** Label for the dropdown header. Default: "Notificaciones". */
  label?: string
  /** Shown when the list is empty. Default: "Sin notificaciones". */
  emptyLabel?: string
  /** Shown on the "mark all read" button. Default: "Marcar todo como leído". */
  markAllLabel?: string
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`
  return d.toLocaleDateString()
}

export function NotificationsBell({
  label = 'Notificaciones',
  emptyLabel = 'Sin notificaciones',
  markAllLabel = 'Marcar todo como leído',
  ...options
}: NotificationsBellProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(options)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-inherit hover:bg-current/10 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-[22px] h-[22px]" aria-hidden="true">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-text-inverse text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 w-80 max-w-[92vw] bg-ui-card dark:bg-ui-dark-card border border-ui-border dark:border-ui-dark-border rounded-md shadow-lg z-[210]"
        >
          <div className="px-3 py-2 flex items-center justify-between border-b border-ui-border dark:border-ui-dark-border">
            <span className="text-sm font-semibold text-text-primary dark:text-text-dark-primary">{label}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-odoo-purple hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                {markAllLabel}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="px-3 py-4 text-sm text-text-muted dark:text-text-dark-muted text-center">
                {emptyLabel}
              </div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => { if (!n.read_at) markRead(n.id) }}
                className={`w-full text-left px-3 py-2 border-b border-ui-border dark:border-ui-dark-border transition-colors hover:bg-ui-body dark:hover:bg-ui-dark-bg last:border-b-0 flex gap-2 items-start ${
                  n.read_at ? 'opacity-70' : ''
                }`}
              >
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    n.read_at ? 'bg-transparent' : 'bg-danger'
                  }`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary dark:text-text-dark-primary truncate">
                      {n.title}
                    </span>
                    <span className="text-xs text-text-muted dark:text-text-dark-muted shrink-0">
                      {formatRelative(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5 line-clamp-2">
                    {n.body}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
