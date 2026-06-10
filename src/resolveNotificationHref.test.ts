import { describe, expect, it } from 'vitest'
import { peerOrigin, resolveNotificationHref } from './resolveNotificationHref'

// Host actual = app dms en un slot con prefijo, dominio nip.io.
const DMS_LOC = { protocol: 'https:', hostname: 'desarrollo-ceedcv-dms.192.168.2.1.nip.io' }
const DASHBOARD_LOC = { protocol: 'https:', hostname: 'dashboard.maya.test' }

describe('peerOrigin', () => {
  it('deriva el origen de un app hermano preservando el slot-prefix', () => {
    expect(peerOrigin('audit', DMS_LOC)).toBe('https://desarrollo-ceedcv-audit.192.168.2.1.nip.io')
  })

  it('self-target reconstruye el mismo origen', () => {
    expect(peerOrigin('dms', DMS_LOC)).toBe('https://desarrollo-ceedcv-dms.192.168.2.1.nip.io')
  })

  it('maneja hosts sin slot-prefix (un solo segmento de servicio)', () => {
    expect(peerOrigin('dms', DASHBOARD_LOC)).toBe('https://dms.maya.test')
  })

  it('fallback a mismo host cuando no hay sub-dominio', () => {
    expect(peerOrigin('dms', { protocol: 'http:', hostname: 'localhost' })).toBe('http://localhost')
  })
})

describe('resolveNotificationHref', () => {
  it('devuelve null sin url', () => {
    expect(resolveNotificationHref(null, 'dms', DMS_LOC)).toBeNull()
    expect(resolveNotificationHref('', 'dms', DMS_LOC)).toBeNull()
  })

  it('respeta urls absolutas tal cual', () => {
    expect(resolveNotificationHref('https://ext.example/x', 'dms', DMS_LOC)).toBe('https://ext.example/x')
  })

  it('sin target_app: relativa al app actual (legacy)', () => {
    expect(resolveNotificationHref('/documents/42', null, DMS_LOC)).toBe('/documents/42')
    expect(resolveNotificationHref('/documents/42', undefined, DMS_LOC)).toBe('/documents/42')
  })

  // EL BUG: desde dms, notificación de OTRA app → debe cross-navegar a su origen.
  it('cross-app: desde dms una notificación de audit abre el recurso en audit', () => {
    expect(resolveNotificationHref('/fichajes/7', 'audit', DMS_LOC)).toBe(
      'https://desarrollo-ceedcv-audit.192.168.2.1.nip.io/fichajes/7',
    )
  })

  it('cross-app: target dashboard desde dms va al dashboard, no al panel de dms', () => {
    expect(resolveNotificationHref('/notifications/9', 'dashboard', DMS_LOC)).toBe(
      'https://desarrollo-ceedcv-dashboard.192.168.2.1.nip.io/notifications/9',
    )
  })

  it('same-app: target dms desde dms apunta a su propio origen (recurso correcto)', () => {
    expect(resolveNotificationHref('/documents/42', 'dms', DMS_LOC)).toBe(
      'https://desarrollo-ceedcv-dms.192.168.2.1.nip.io/documents/42',
    )
  })

  it('normaliza la barra inicial ausente', () => {
    expect(resolveNotificationHref('documents/42', 'audit', DMS_LOC)).toBe(
      'https://desarrollo-ceedcv-audit.192.168.2.1.nip.io/documents/42',
    )
  })
})
