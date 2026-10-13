import { captureError } from './sentry'

/**
 * Log de debug — silencieux en production (build release), actif en dev.
 * Remplacer les `console.log` d'instrumentation par `log(...)`.
 */
export const log = (...args: unknown[]): void => {
  if (__DEV__) console.log(...args)
}

/** Erreur rattrapée mais utile au diagnostic : console en dev, Sentry en production. */
export const logError = (scope: string, err: unknown, extra?: Record<string, unknown>): void => {
  if (__DEV__) console.warn(`[${scope}]`, err)
  else captureError(err, { scope, ...extra })
}
