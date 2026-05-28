import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@ceedcv-maya/shared-auth-react'

// laravel-echo + pusher-js — importaciones dinámicas para no romper SSR/envs
// que no tengan las variables de entorno configuradas.
type EchoChannel = {
  listen: (event: string, cb: (data: unknown) => void) => EchoChannel
  stopListening: (event: string) => EchoChannel
}

type LaravelEchoInstance = {
  private: (channel: string) => EchoChannel
  disconnect: () => void
}

/**
 * Variables de entorno Reverb (Vite).
 * Si alguna está ausente, el provider cae en modo polling.
 */
function readReverbConfig(): {
  host: string
  key: string
  port: number
  scheme: string
} | null {
  const host = import.meta.env['VITE_REVERB_HOST'] as string | undefined
  const key = import.meta.env['VITE_REVERB_APP_KEY'] as string | undefined
  if (!host || !key) return null
  const port = Number(import.meta.env['VITE_REVERB_PORT'] ?? 8080)
  const scheme = (import.meta.env['VITE_REVERB_SCHEME'] as string | undefined) ?? 'http'
  return { host, key, port, scheme }
}

// ────────────────────────────────────────────────────────────────────────────
// Context
// ────────────────────────────────────────────────────────────────────────────

export interface NotificationChannelContextValue {
  /** Canal privado de notificaciones del usuario actual, o null si no disponible. */
  channel: EchoChannel | null
  /** true si la conexión WebSocket está activa. */
  wsConnected: boolean
}

const NotificationChannelContext = createContext<NotificationChannelContextValue>({
  channel: null,
  wsConnected: false,
})

export function useNotificationChannel(): NotificationChannelContextValue {
  return useContext(NotificationChannelContext)
}

// ────────────────────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────────────────────

export interface NotificationProviderProps {
  children: ReactNode
}

/**
 * Provider que gestiona UNA SOLA conexión WebSocket por aplicación.
 * Todos los `useNotifications` en la misma app comparten el socket via context.
 *
 * Variables de entorno necesarias (Vite):
 *   VITE_REVERB_HOST      — host de Reverb (e.g. "localhost")
 *   VITE_REVERB_APP_KEY   — app key de Reverb
 *   VITE_REVERB_PORT      — puerto (default 8080)
 *   VITE_REVERB_SCHEME    — http o https (default "http")
 *
 * Si las variables no están presentes o la conexión falla, el provider no
 * expone canal (channel = null). En ese caso `useNotifications` cae en el
 * comportamiento de polling HTTP sin cambios.
 *
 * El canal suscrito es `private-notifications.{userId}` usando el `sub` del
 * usuario autenticado via `useAuth()`.
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  let auth: ReturnType<typeof useAuth> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    auth = useAuth()
  } catch {
    // Si no hay AuthProvider en el árbol, el provider funciona sin WS.
  }

  const token = auth?.token ?? null
  const userId = auth?.user?.sub ?? null

  const [channel, setChannel] = useState<EchoChannel | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const echoRef = useRef<LaravelEchoInstance | null>(null)

  useEffect(() => {
    const config = readReverbConfig()
    if (!config || !token || !userId) {
      // Sin configuración o sin auth → no conectar
      return
    }

    let echo: LaravelEchoInstance | null = null
    let cancelled = false

    async function connect() {
      try {
        // new Function escapa el análisis estático de Vite — laravel-echo y
        // pusher-js son peer deps opcionales que solo existen cuando Reverb
        // está activo. El consumidor los instala; la app host no los necesita.
        const dynImport = new Function('s', 'return import(s)') as (s: string) => Promise<{ default: unknown }>
        const [{ default: Echo }, { default: Pusher }] = await Promise.all([
          dynImport('laravel-echo'),
          dynImport('pusher-js'),
        ])

        if (cancelled) return

        // Asignar Pusher al scope global — requerido por Laravel Echo con driver pusher
        ;(window as typeof window & { Pusher: typeof Pusher }).Pusher = Pusher

        const echoInstance = new Echo({
          broadcaster: 'reverb',
          key: config!.key,
          wsHost: config!.host,
          wsPort: config!.port,
          wssPort: config!.port,
          forceTLS: config!.scheme === 'https',
          enabledTransports: ['ws', 'wss'],
          authEndpoint: '/api/broadcasting/auth',
          auth: {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
        }) as unknown as LaravelEchoInstance

        if (cancelled) {
          echoInstance.disconnect()
          return
        }

        echoRef.current = echoInstance

        const privateChannel = echoInstance.private(`notifications.${userId}`)
        setChannel(privateChannel)
        setWsConnected(true)
        echo = echoInstance
      } catch {
        // Fallo de conexión → modo polling (channel permanece null)
        setChannel(null)
        setWsConnected(false)
      }
    }

    void connect()

    return () => {
      cancelled = true
      if (echo) {
        echo.disconnect()
      } else if (echoRef.current) {
        echoRef.current.disconnect()
      }
      echoRef.current = null
      setChannel(null)
      setWsConnected(false)
    }
  }, [token, userId])

  return (
    <NotificationChannelContext.Provider value={{ channel, wsConnected }}>
      {children}
    </NotificationChannelContext.Provider>
  )
}
