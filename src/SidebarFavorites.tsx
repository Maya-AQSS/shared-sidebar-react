import { useTranslation } from 'react-i18next'
import { useSidebarCollapsed } from '@ceedcv-maya/shared-layout-react'
import { useSharedFavorites, type UseSharedFavoritesOptions } from './useSharedFavorites'
import { getAppIcon } from './appIcons'

export interface SidebarFavoritesProps extends UseSharedFavoritesOptions {
  /** Section title shown above the list. Already-translated string. */
  label?: string
}

/**
 * Sidebar widget that renders the user's favorite applications across all
 * Maya apps. Links open each app at its traefik_url. No link decoration is
 * forced — the consumer layout drives the visual styling.
 *
 * Cada favorito se pinta con su icono único (`icon`) dentro de un círculo
 * tintado por su color de marca (`color`). Si la app no tiene icon/color
 * en el catálogo, se cae a star + warning tint.
 *
 * En modo sidebar colapsado: muestra solo el avatar circular, sin texto.
 */
export function SidebarFavorites({ label, ...authOptions }: SidebarFavoritesProps) {
  const { t } = useTranslation('common')
  const { favorites } = useSharedFavorites(authOptions)
  const collapsed = useSidebarCollapsed()
  const sectionLabel = label ?? t('nav.favorites', { defaultValue: 'Favorites' })

  if (!favorites.length) return null

  return (
    <div
      className={[
        'mt-4 pt-3 border-t border-text-inverse/8',
        collapsed ? 'px-0' : 'px-1',
      ].join(' ')}
    >
      {!collapsed && (
        <p className="text-xs font-semibold text-text-inverse/40 uppercase tracking-wider px-2 mb-1">
          {sectionLabel}
        </p>
      )}
      {favorites.map((fav) => (
        // Icono sin color — hereda el tono `text-text-inverse/70` del NavLink
        // padre y se intensifica a `text-text-inverse` en hover. El icono
        // único por app sigue diferenciándolas; el color de marca se reserva
        // para superficies destacadas (badges, headers) donde no compite con
        // los items principales del sidebar.
        <a
          key={fav.id}
          href={fav.traefik_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          title={fav.name}
          className={[
            'flex items-center rounded-xl text-sm font-medium text-text-inverse/70 hover:text-text-inverse hover:bg-text-inverse/8 transition-colors whitespace-nowrap overflow-hidden',
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5',
          ].join(' ')}
        >
          <span
            className="shrink-0 w-6 h-6 flex items-center justify-center [&>svg]:w-[22px] [&>svg]:h-[22px]"
            aria-hidden="true"
          >
            {getAppIcon(fav.icon)}
          </span>
          {!collapsed && <span className="truncate">{fav.name}</span>}
        </a>
      ))}
    </div>
  )
}
