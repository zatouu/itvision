import Constants from 'expo-constants'

/**
 * Configuration publique de l'app, lue une seule fois.
 * Ordre : variable EXPO_PUBLIC_* inlinée par Metro → valeur embarquée par app.config.js (extra)
 * → repli. En production, le repli est l'API de prod : un OTA publié sans variables
 * d'environnement ne doit jamais faire pointer l'app vers localhost.
 */
const PRODUCTION_API_URL = 'https://itvisionplus.sn'

const extra = ((Constants?.expoConfig as { extra?: Record<string, unknown> } | null)?.extra || {}) as Record<string, unknown>
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : '')

export const API_BASE_URL = (
  text(process.env.EXPO_PUBLIC_API_BASE_URL)
  || text(extra.apiBaseUrl)
  || (__DEV__ ? 'http://localhost:3000' : PRODUCTION_API_URL)
).replace(/\/+$/, '')

export const SENTRY_DSN = text(process.env.EXPO_PUBLIC_SENTRY_DSN) || text(extra.sentryDsn)
