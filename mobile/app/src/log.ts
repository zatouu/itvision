/**
 * Log de debug — silencieux en production (build release), actif en dev.
 * Remplacer les `console.log` d'instrumentation par `log(...)`.
 */
export const log = (...args: unknown[]): void => {
  if (__DEV__) console.log(...args)
}
