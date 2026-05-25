/**
 * Cross-component (and cross-tab) notification channel for favorite changes.
 *
 * Same-tab: a window CustomEvent lets components that don't share React state
 * stay in sync (e.g. the sidebar in AppLayout refreshing after a star toggle
 * on the Applications page).
 *
 * Cross-tab: a localStorage write fires the native `storage` event on other
 * tabs, so the sidebar refreshes in every open window.
 */

const EVENT_NAME = 'maya:favorites-changed'
const STORAGE_KEY = 'maya:favorites-updated-at'

export function notifyFavoritesChanged(): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  } catch {
    /* no-op */
  }
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    /* no-op — private mode / quota exceeded */
  }
}

export function subscribeToFavoritesChanges(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const onCustom = () => handler()
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) handler()
  }

  window.addEventListener(EVENT_NAME, onCustom as EventListener)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(EVENT_NAME, onCustom as EventListener)
    window.removeEventListener('storage', onStorage)
  }
}
