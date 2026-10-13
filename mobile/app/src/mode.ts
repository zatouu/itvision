import AsyncStorage from '@react-native-async-storage/async-storage'
import { getAuthUser } from './auth'

/**
 * Mode applicatif : 'client' (demandes de services) ou 'provider' (prestataire).
 * La distinction est applicative — un même utilisateur peut avoir les deux
 * profils et basculer. Le mode est persisté et restauré au démarrage.
 */

export type AppMode = 'client' | 'provider'

const MODE_KEY = 'xeuy:mode'

let _mode: AppMode = 'client'
const listeners: Set<(mode: AppMode) => void> = new Set()

function notify() {
  listeners.forEach(fn => fn(_mode))
}

export function subscribeMode(fn: (mode: AppMode) => void) {
  listeners.add(fn)
  fn(_mode)
  return () => { listeners.delete(fn) }
}

export function getMode(): AppMode { return _mode }

/**
 * L'utilisateur peut-il utiliser le mode prestataire ?
 * Capacité = présence d'un ProviderProfile (ou rôle PROVIDER hérité) —
 * jamais le rôle global seul.
 */
export function isProviderCapable(): boolean {
  const u = getAuthUser()
  return !!u && (u.role === 'PROVIDER' || u.role === 'TECHNICIAN' || !!u.providerProfileId)
}

/** Route d'accueil associée au mode courant. */
export function homeRouteForMode(mode: AppMode = _mode): string {
  return mode === 'provider' ? '/pro-home' : '/'
}

export async function setMode(mode: AppMode): Promise<void> {
  // Un non-prestataire ne peut pas entrer en mode provider
  if (mode === 'provider' && !isProviderCapable()) mode = 'client'
  _mode = mode
  try { await AsyncStorage.setItem(MODE_KEY, mode) } catch { /* ignore */ }
  notify()
}

export function resetMode(): void {
  _mode = 'client'
  AsyncStorage.removeItem(MODE_KEY).catch(() => {})
  notify()
}

/** Charge le mode persisté au démarrage (après loadAuth). */
export async function loadMode(): Promise<AppMode> {
  try {
    const saved = await AsyncStorage.getItem(MODE_KEY)
    if (saved === 'provider' && isProviderCapable()) {
      _mode = 'provider'
    } else if (saved !== 'provider' && isProviderCapable() && !saved) {
      // Première ouverture d'un compte prestataire → mode provider par défaut
      _mode = 'provider'
    } else {
      _mode = 'client'
    }
  } catch { /* ignore */ }
  notify()
  return _mode
}
