/**
 * Catálogo de iconos disponibles para apps del ecosistema CEED.
 *
 * El backend (maya_authorization.applications) almacena solo el slug
 * (`icon` column) — este mapa lo resuelve a un componente React. Los
 * iconos siguen el estilo lucide-react (stroke-based) y usan
 * `currentColor` para permitir tintarlo desde CSS.
 *
 * Para añadir uno nuevo: incluir aquí slug + SVG y aplicar el mismo slug
 * en el seeder (applications_mock.php).
 */
import type { ReactNode } from 'react'

const baseProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const StarFallback = (
  <svg {...baseProps}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const APP_ICONS: Record<string, ReactNode> = {
  'layout-grid': (
    <svg {...baseProps}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
  'file-text': (
    <svg {...baseProps}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  ),
  'shield-check': (
    <svg {...baseProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  'activity': (
    <svg {...baseProps}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  'clipboard-check': (
    <svg {...baseProps}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  'star': StarFallback,
}

/**
 * Resuelve un slug a un nodo React. Si el slug no existe (o es null/undefined),
 * devuelve el icono fallback (estrella).
 */
export function getAppIcon(slug: string | null | undefined): ReactNode {
  if (!slug) return StarFallback
  return APP_ICONS[slug] ?? StarFallback
}
