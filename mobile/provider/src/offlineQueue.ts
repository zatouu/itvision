import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { useEffect, useState } from 'react'

// ─── Config ────────────────────────────────────────────────────────────────────
const QUEUE_KEY = 'offline:queue'
const MAX_ATTEMPTS = 5
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24h

// ─── Types ─────────────────────────────────────────────────────────────────────
export type HttpMethod = 'POST' | 'PATCH'

export interface QueueEntry {
  id: string
  method: HttpMethod
  path: string
  body: Record<string, unknown>
  createdAt: number
  attempts: number
  lastError?: string
}

export type ReplayResult = {
  replayed: number
  failed: number
  remaining: number
}

export type Executor = (method: HttpMethod, path: string, body: Record<string, unknown>) => Promise<unknown>

// ─── Helpers ───────────────────────────────────────────────────────────────────
function uid(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const NETWORK_ERROR_PATTERNS = [
  'network request failed',
  'réseau indisponible',
  'délai dépassé',
  'failed to fetch',
  'aborterror',
  'timeout',
  'net::err_',
] as const

export function isNetworkError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || '').toLowerCase()
  return NETWORK_ERROR_PATTERNS.some(p => msg.includes(p))
}

// ─── Storage ───────────────────────────────────────────────────────────────────
async function readQueue(): Promise<QueueEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

async function writeQueue(queue: QueueEntry[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

// ─── Public API ────────────────────────────────────────────────────────────────
export async function enqueue(entry: Omit<QueueEntry, 'id' | 'createdAt' | 'attempts'>): Promise<void> {
  const queue = await readQueue()

  // Déduplication : même method + path + body sérialisé → pas de doublon
  const bodyStr = JSON.stringify(entry.body)
  const isDuplicate = queue.some(
    q => q.method === entry.method && q.path === entry.path && JSON.stringify(q.body) === bodyStr
  )
  if (isDuplicate) return

  queue.push({
    ...entry,
    id: uid(),
    createdAt: Date.now(),
    attempts: 0,
  })
  await writeQueue(queue)
  notifyListeners()
}

export async function replay(executor: Executor): Promise<ReplayResult> {
  const raw = await readQueue()
  if (raw.length === 0) return { replayed: 0, failed: 0, remaining: 0 }

  const now = Date.now()
  // Pré-nettoyage : retirer les entrées expirées ou épuisées
  const queue = raw.filter(e => e.attempts < MAX_ATTEMPTS && (now - e.createdAt) < MAX_AGE_MS)

  let replayed = 0
  let failed = 0
  const kept: QueueEntry[] = []
  let networkDown = false

  for (let i = 0; i < queue.length; i++) {
    const entry = queue[i]

    if (networkDown) {
      // Réseau coupé → on garde tout le reste tel quel
      kept.push(entry)
      continue
    }

    try {
      await executor(entry.method, entry.path, entry.body)
      replayed++
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        // Réseau encore down → incrémenter, garder cette entrée + tout le reste
        networkDown = true
        entry.attempts++
        entry.lastError = (err as Error).message
        kept.push(entry)
      } else {
        // Erreur métier (4xx etc.) → on retire, ça ne marchera jamais
        failed++
      }
    }
  }

  await writeQueue(kept)
  notifyListeners()
  return { replayed, failed, remaining: kept.length }
}

export async function getQueueSize(): Promise<number> {
  return (await readQueue()).length
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY)
  notifyListeners()
}

// ─── NetInfo auto-replay ───────────────────────────────────────────────────────
let _executor: Executor | null = null
let _unsubscribeNetInfo: (() => void) | null = null
let _isReplaying = false

export function startNetInfoReplay(executor: Executor): () => void {
  _executor = executor
  if (_unsubscribeNetInfo) _unsubscribeNetInfo()

  _unsubscribeNetInfo = NetInfo.addEventListener(async (state: NetInfoState) => {
    if (!state.isConnected || !_executor || _isReplaying) return

    const size = await getQueueSize()
    if (size === 0) return

    _isReplaying = true
    try {
      const result = await replay(_executor)
      if (result.replayed > 0) {
        console.log(`[OfflineQueue] Replayed ${result.replayed} action(s) on reconnect`)
      }
    } catch {
      // Silently fail — next connectivity change will retry
    } finally {
      _isReplaying = false
    }
  })

  return () => {
    if (_unsubscribeNetInfo) {
      _unsubscribeNetInfo()
      _unsubscribeNetInfo = null
    }
    _executor = null
  }
}

// ─── Reactive listeners (for hooks) ───────────────────────────────────────────
type Listener = () => void
const listeners = new Set<Listener>()

function notifyListeners() {
  listeners.forEach(fn => fn())
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// ─── React hook ────────────────────────────────────────────────────────────────
export function useOfflineQueueSize(): number {
  const [size, setSize] = useState(0)

  useEffect(() => {
    getQueueSize().then(setSize)
    const unsub = subscribe(() => {
      getQueueSize().then(setSize)
    })
    return unsub
  }, [])

  return size
}
