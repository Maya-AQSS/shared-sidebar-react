import { EditorContentHtml } from '@ceedcv-maya/shared-editor-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveNotificationHref } from './resolveNotificationHref'
import {
  useNotifications,
  type SharedNotification,
  type SharedNotificationSeverity,
  type UseNotificationsOptions,
} from './useNotifications'

/**
 * Las notificaciones llegan con texto ya renderizado por el backend (en un
 * locale que NO tiene por qué ser el del usuario) y, además, con la clave i18n
 * + params. Re-resolvemos en cliente contra el namespace `notifications` para
 * que siempre se muestren en el idioma activo (sincronizado desde `me.locale`).
 * Contrato espejo de `App\Support\NotificationContent::resolve` (backend).
 */
type LocalizedMap = Record<string, string | undefined>

function useNotificationText() {
  const { t, i18n } = useTranslation('notifications')
  const currentLocale = (i18n.resolvedLanguage ?? i18n.language ?? '').split('-')[0]
  return (
    key: string | null,
    fallback: string,
    params: Record<string, unknown>,
    localized?: LocalizedMap | null,
    localizedDefault?: string | null,
  ): string => {
    if (key) {
      const k = key.startsWith('notifications.') ? key.slice('notifications.'.length) : key
      if (i18n.exists(k, { ns: 'notifications' })) {
        return t(k, { ns: 'notifications', ...params }) as string
      }
    }
    if (localized) {
      const hit = localized[currentLocale]
      if (hit != null && hit !== '') return hit
      if (localizedDefault) {
        const fb = localized[localizedDefault]
        if (fb != null && fb !== '') return fb
      }
    }
    return fallback
  }
}

/** Lee metadata.i18n de una notificación de alerta manual (title/body por locale). */
function readI18nMeta(metadata: Record<string, unknown> | undefined): {
  title?: LocalizedMap
  body?: LocalizedMap
  default?: string
} {
  const i18n = metadata?.i18n
  if (i18n == null || typeof i18n !== 'object') return {}
  const m = i18n as Record<string, unknown>
  return {
    title: (m.title as LocalizedMap | undefined) ?? undefined,
    body: (m.body as LocalizedMap | undefined) ?? undefined,
    default: typeof m.default_locale === 'string' ? m.default_locale : undefined,
  }
}

export interface NotificationsBellProps extends UseNotificationsOptions {
  /** Label for the dropdown header. Default: "Notificaciones". */
  label?: string
  /** Shown when the list is empty. Default: "Sin notificaciones". */
  emptyLabel?: string
  /** Shown on the "mark all read" button. Default: "Marcar todo como leído". */
  markAllLabel?: string
  /**
   * Called when a notification is clicked, so the host app routes with its own
   * router (typically to the notification detail page). If not provided, falls
   * back to navigating to the notification's `url` resource via window.location.
   */
  onNavigate?: (notification: SharedNotification) => void
}

/** Tailwind dot colour per severity (design-token utility classes). */
const SEVERITY_DOT: Record<SharedNotificationSeverity, string> = {
  critical: 'bg-danger',
  high: 'bg-warning',
  medium: 'bg-info',
  low: 'bg-text-muted',
  info: 'bg-text-muted',
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
  onNavigate,
  ...options
}: NotificationsBellProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(options)
  const resolveText = useNotificationText()
  const [open, setOpen] = useState(false)

  const handleSelect = (n: SharedNotification) => {
    if (!n.read_at) markRead(n.id)
    setOpen(false)
    // Host routes (typically to the notification detail). Without a handler,
    // resolve the resource URL: same-app stays local, cross-app is made absolute
    // via peerOrigin(target_app) so the resource opens in ITS app (no longer
    // mis-resolving a foreign relative url against the current app's host).
    if (onNavigate) {
      onNavigate(n)
      return
    }
    const href = resolveNotificationHref(n.url, n.target_app, window.location)
    if (href) window.location.assign(href)
  }
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
            {notifications.map((n) => {
              const i18nMeta = readI18nMeta(n.metadata)
              const title = resolveText(n.title_key, n.title, n.params, i18nMeta.title, i18nMeta.default)
              const body = resolveText(n.body_key, n.body, n.params, i18nMeta.body, i18nMeta.default)
              return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleSelect(n)}
                className={`w-full text-left px-3 py-2 border-b border-ui-border dark:border-ui-dark-border transition-colors hover:bg-ui-body dark:hover:bg-ui-dark-bg last:border-b-0 flex gap-2 items-start ${
                  n.read_at ? 'opacity-70' : ''
                }`}
              >
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    n.read_at ? 'bg-transparent' : SEVERITY_DOT[n.severity]
                  }`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <EditorContentHtml
                      html={title}
                      className="text-sm font-medium text-text-primary dark:text-text-dark-primary truncate line-clamp-1 min-w-0 [&_p]:inline [&_p]:m-0"
                    />
                    <span className="text-xs text-text-muted dark:text-text-dark-muted shrink-0">
                      {formatRelative(n.created_at)}
                    </span>
                  </div>
                  {body ? (
                    <EditorContentHtml
                      html={body}
                      className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5 line-clamp-2 [&_p]:m-0"
                    />
                  ) : null}
                </div>
              </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
