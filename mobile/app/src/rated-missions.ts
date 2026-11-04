import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Missions déjà notées sur cet appareil : l'avis peut partir en file hors ligne (apiPostQueued),
 * le bouton « Noter » doit pourtant disparaître immédiatement.
 */
const KEY = 'rated-missions'
const MAX = 200

async function read(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

export async function markMissionRated(requestId: string): Promise<void> {
  if (!requestId) return
  const list = await read()
  if (list.includes(requestId)) return
  await AsyncStorage.setItem(KEY, JSON.stringify([requestId, ...list].slice(0, MAX))).catch(() => {})
}

export async function isMissionRated(requestId: string): Promise<boolean> {
  if (!requestId) return false
  return (await read()).includes(requestId)
}
