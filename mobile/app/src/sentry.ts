import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || ''
const IS_DEV = __DEV__
// Numéros sénégalais et jetons : jamais envoyés à un service tiers
const PHONE = /(\+?221[\s.-]?)?\b7[05678](?:[\s.-]?\d){7}\b/g
const BEARER = /Bearer\s+[\w.-]+/gi
const mask = (s?: string) => s?.replace(BEARER, 'Bearer [masqué]').replace(PHONE, '[téléphone]')

function scrubEvent<T extends { user?: any; message?: string; exception?: { values?: Array<{ value?: string }> }; request?: { headers?: Record<string, string> } }>(event: T): T {
  if (event.user) event.user = { id: event.user.id }
  if (event.message) event.message = mask(event.message)
  for (const ex of event.exception?.values || []) ex.value = mask(ex.value)
  if (event.request?.headers) {
    for (const k of Object.keys(event.request.headers)) {
      if (/authorization|cookie/i.test(k)) event.request.headers[k] = '[masqué]'
    }
  }
  return event
}

export function initSentry(): void {
  if (!DSN) {
    if (IS_DEV) console.log('[Sentry] Pas de DSN — monitoring désactivé')
    return
  }

  Sentry.init({
    dsn: DSN,
    environment: IS_DEV ? 'development' : 'production',
    release: `xeuy@${Constants.expoConfig?.version ?? '0.0.0'}`,
    tracesSampleRate: IS_DEV ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,
    debug: IS_DEV,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => (crumb.message ? { ...crumb, message: mask(crumb.message) } : crumb),
  })
}

export function setUser(id: string, _phone?: string): void {
  Sentry.setUser({ id })
}

export function clearUser(): void {
  Sentry.setUser(null)
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (context) Sentry.setContext('extra', context)
  Sentry.captureException(err)
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({ category, message, data, level: 'info' })
}
