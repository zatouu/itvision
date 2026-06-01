import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSocket, disconnectSocket } from './socket'

const KEY = 'provider:online'
const listeners = new Set<(v: boolean) => void>()
let current = false

export async function loadInitial(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    current = v === '1'
  } catch { current = false }
  // applique l'état réel au socket
  if (current) goOnline()
  return current
}

export function isOnline() { return current }

export function subscribe(fn: (v: boolean) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

function emit() {
  for (const fn of listeners) fn(current)
}

export async function goOnline() {
  current = true
  try { await AsyncStorage.setItem(KEY, '1') } catch {}
  const s = getSocket()
  const join = () => s.emit('join-provider-channel')
  if (s.connected) {
    join()
  } else {
    s.once('connect', join)
    s.connect()
  }
  emit()
}

export async function goOffline() {
  current = false
  try { await AsyncStorage.setItem(KEY, '0') } catch {}
  const s = getSocket()
  if (s.connected) {
    s.emit('leave-provider-channel')
    s.disconnect()
  }
  emit()
}

export async function toggleOnline() {
  if (current) await goOffline()
  else await goOnline()
  return current
}
