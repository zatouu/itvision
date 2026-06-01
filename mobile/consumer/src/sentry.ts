import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || ''
const IS_DEV = __DEV__

export function initSentry(): void {
  if (!DSN) {
    if (IS_DEV) console.log('[Sentry] Pas de DSN — monitoring désactivé')
    return
  }

  Sentry.init({
    dsn: DSN,
    environment: IS_DEV ? 'development' : 'production',
    release: `ligey-consumer@${Constants.expoConfig?.version ?? '0.0.0'}`,
    tracesSampleRate: IS_DEV ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,
    debug: IS_DEV,
  })
}

export function setUser(id: string, phone?: string): void {
  Sentry.setUser({ id, ...(phone ? { username: phone } : {}) })
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
