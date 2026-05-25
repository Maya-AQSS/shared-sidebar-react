import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@maya/shared-auth-react'
import { subscribeToFavoritesChanges } from './favoritesBus'

export interface SharedFavorite {
  id: number
  name: string
  slug: string
  /** Slug del icono (lucide-style) servido por el catálogo de apps. */
  icon?: string | null
  /** Hex `#RRGGBB` único por app — tinta el avatar circular del favorito. */
  color?: string | null
  traefik_url?: string | null
}

export interface UseSharedFavoritesOptions {
  /**
   * Base URL of the maya_dashboard backend that owns the
   * `/api/v1/dashboard/user/{sub}/favorites` endpoint.
   * Example: "https://dashboard-api.maya.test"
   */
  dashboardApiUrl: string
  /**
   * Optional overrides for apps that do not use @maya/shared-auth-react
   * (e.g. DMS uses its own OIDC hook). If omitted, the values are read
   * from the AuthContext.
   */
  token?: string | null
  userSub?: string | null
}

function useAuthSafe() {
  // The AuthContext throws when used outside its provider. Apps that inject
  // token/userSub manually don't want that — swallow the error and return null.
  try {
    return useAuth()
  } catch {
    return null
  }
}

/**
 * Fetches the shared favorites list for the authenticated user from the
 * maya_dashboard backend. Returns an empty array if there is no session yet
 * or the backend is unreachable — the sidebar gracefully hides itself.
 */
export function useSharedFavorites({ dashboardApiUrl, token: tokenOverride, userSub: userSubOverride }: UseSharedFavoritesOptions) {
  const auth = useAuthSafe()
  const token = tokenOverride ?? auth?.token ?? null
  const userSub = userSubOverride ?? auth?.user?.sub ?? null

  const [favorites, setFavorites] = useState<SharedFavorite[]>([])
  const [loading, setLoading] = useState(false)
  // Bump to trigger an additional refetch (e.g. after favoritesBus notification).
  const [refetchTick, setRefetchTick] = useState(0)
  const refetch = useCallback(() => setRefetchTick((n) => n + 1), [])

  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  // Subscribe to same-tab and same-origin cross-tab bus notifications.
  useEffect(() => {
    return subscribeToFavoritesChanges(() => refetchRef.current())
  }, [])

  // Poll every 30 s when the tab is visible to catch cross-app changes
  // (cross-origin localStorage events never fire between different subdomains).
  useEffect(() => {
    const POLL_MS = 30_000

    let intervalId: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (intervalId !== null) return
      intervalId = setInterval(() => refetchRef.current(), POLL_MS)
    }

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchRef.current() // immediate refetch on tab focus
        startPolling()
      } else {
        stopPolling()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    if (document.visibilityState === 'visible') startPolling()

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stopPolling()
    }
  }, [])

  useEffect(() => {
    if (!userSub || !token || !dashboardApiUrl) {
      setFavorites([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let cancelled = false

    async function fetchFavorites() {
      setLoading(true)
      try {
        const base = dashboardApiUrl.replace(/\/$/, '')
        const url = `${base}/api/v1/dashboard/user/${encodeURIComponent(userSub!)}/favorites`
        const resp = await fetch(url, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })
        if (!resp.ok) {
          if (!cancelled) setFavorites([])
          return
        }
        const payload = await resp.json()
        const list: SharedFavorite[] = Array.isArray(payload) ? payload : (payload?.data ?? [])
        if (!cancelled) setFavorites(list)
      } catch {
        if (!cancelled) setFavorites([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchFavorites()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [userSub, token, dashboardApiUrl, refetchTick])

  return { favorites, loading, refetch }
}
