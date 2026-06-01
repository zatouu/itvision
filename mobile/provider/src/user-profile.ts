import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiGet } from './api'

const STORAGE_KEY = 'provider:profile'

interface ProviderProfile {
  _id: string
  name: string
  email?: string
  phone?: string
}

let cached: ProviderProfile | null = null
const listeners: Set<(p: ProviderProfile | null) => void> = new Set()

function notify() {
  listeners.forEach(fn => fn(cached))
}

export function subscribeProfile(fn: (p: ProviderProfile | null) => void) {
  listeners.add(fn)
  fn(cached)
  return () => { listeners.delete(fn) }
}

export function getProfile(): ProviderProfile | null { return cached }

export function getProviderName(): string {
  return cached?.name || process.env.EXPO_PUBLIC_PROVIDER_NAME || 'Prestataire'
}

export async function loadProfile(): Promise<ProviderProfile | null> {
  // Essayer le cache local d'abord
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (stored) {
      cached = JSON.parse(stored)
      notify()
    }
  } catch { /* ignore */ }

  // Fetch serveur
  try {
    const res = await apiGet('/api/client/profile')
    if (res?.profile) {
      cached = {
        _id: res.profile._id,
        name: res.profile.name || '',
        email: res.profile.email,
        phone: res.profile.phone,
      }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
      notify()
    }
  } catch { /* silencieux — garde le cache */ }

  return cached
}
