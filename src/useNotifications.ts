import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@ceedcv-maya/shared-auth-react'

export interface SharedNotification {
  id: number
  app: string
  type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
  metadata?: Record<string, unknown>
}

export interface UseNotificationsOptions {
  dashboardApiUrl: string
  /** Poll interval in ms for fresh notifications. Set 0 to disable. */
  pollMs?: number
  token?: string | null
  userSub?: string | null
}

function useAuthSafe() {
  try {
    return useAuth()
  } catch {
    return null
  }
}

/**
 * Fetches the latest notifications for the current user from the maya_dashboard
 * backend. The list and the unread count are exposed together so a <Bell/>
 * component can render a badge without a second round-trip.
 */
export function useNotifications({ dashboardApiUrl, pollMs = 60_000, token: tokenOverride, userSub: userSubOverride }: UseNotificationsOptions) {
  const auth = useAuthSafe()
  const token = tokenOverride ?? auth?.token ?? null
  const userSub = userSubOverride ?? auth?.user?.sub ?? null

  const [notifications, setNotifications] = useState<SharedNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchRef = useRef<() => Promise<void>>(async () => {})

  const refetch = useCallback(async () => {
    if (!token || !userSub || !dashboardApiUrl) {
      setNotifications([])
      setUnreadCount(0)
      return
    }
    const base = dashboardApiUrl.replace(/\/$/, '')
    try {
      const [listResp, countResp] = await Promise.all([
        fetch(`${base}/api/v1/notifications?per_page=10`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        }),
        fetch(`${base}/api/v1/notifications/unread-count`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        }),
      ])
      if (listResp.ok) {
        const data = await listResp.json()
        setNotifications(Array.isArray(data?.data) ? data.data : [])
      }
      if (countResp.ok) {
        const data = await countResp.json()
        setUnreadCount(Number(data?.unread ?? 0))
      }
    } catch {
      /* network error — keep previous state */
    }
  }, [token, userSub, dashboardApiUrl])

  fetchRef.current = refetch

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    if (!pollMs || pollMs <= 0) return
    const id = setInterval(() => { fetchRef.current() }, pollMs)
    return () => clearInterval(id)
  }, [pollMs])

  const markRead = useCallback(async (id: number) => {
    if (!token || !dashboardApiUrl) return
    const base = dashboardApiUrl.replace(/\/$/, '')
    try {
      const resp = await fetch(`${base}/api/v1/notifications/${id}/read`, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      if (resp.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
        setUnreadCount((c) => Math.max(0, c - 1))
      }
    } catch { /* no-op */ }
  }, [token, dashboardApiUrl])

  const markAllRead = useCallback(async () => {
    if (!token || !dashboardApiUrl) return
    const base = dashboardApiUrl.replace(/\/$/, '')
    try {
      const resp = await fetch(`${base}/api/v1/notifications/mark-all-read`, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      if (resp.ok) {
        const now = new Date().toISOString()
        setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
        setUnreadCount(0)
      }
    } catch { /* no-op */ }
  }, [token, dashboardApiUrl])

  return { notifications, unreadCount, refetch, markRead, markAllRead }
}
