import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  ts: number
}

export async function cacheSet<T>(key: string, data: T, _ttlMs = CACHE_TTL_MS): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() }
    await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(entry))
  } catch {}
}

export async function cacheGet<T>(key: string, ttlMs = CACHE_TTL_MS): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.ts > ttlMs) return null
    return entry.data
  } catch {
    return null
  }
}

/** Renvoie les données du cache immédiatement puis charge depuis le réseau.
 *  onData est appelé 1 ou 2 fois : d'abord avec le cache si dispo, puis avec le résultat réseau.
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  onData: (data: T, fromCache: boolean) => void,
  ttlMs = CACHE_TTL_MS
): Promise<void> {
  const cached = await cacheGet<T>(key, ttlMs)
  if (cached !== null) onData(cached, true)

  try {
    const fresh = await fetcher()
    await cacheSet(key, fresh)
    onData(fresh, false)
  } catch (e) {
    if (cached === null) throw e // pas de cache → propaguer l'erreur
  }
}

export async function cacheClear(key: string): Promise<void> {
  try { await AsyncStorage.removeItem(`cache:${key}`) } catch {}
}

export async function cacheClearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys()
    const cacheKeys = keys.filter(k => k.startsWith('cache:'))
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys)
  } catch {}
}
