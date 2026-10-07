import { EventEmitter } from 'events'
import type { ThreadType } from '@/lib/messaging/thread-message-schema'

export type ThreadEvent =
  | { kind: 'message'; message: unknown }
  | { kind: 'read'; readerId: string; at: Date }

type Bus = EventEmitter

// Singleton sur globalThis : les routes Next sont bundlées séparément mais partagent le processus.
// Plusieurs instances Node → remplacer par Redis pub/sub (ioredis est déjà présent).
const globalBus = globalThis as typeof globalThis & { __threadEventBus?: Bus }
const bus: Bus = globalBus.__threadEventBus ?? new EventEmitter()
bus.setMaxListeners(0)
globalBus.__threadEventBus = bus

const channel = (threadType: ThreadType, threadId: string) => `${threadType}:${threadId}`

export function publishThreadEvent(threadType: ThreadType, threadId: string, event: ThreadEvent) {
  bus.emit(channel(threadType, String(threadId)), event)
}

/** Abonnement aux événements d'un fil ; renvoie la fonction de désabonnement. */
export function subscribeThread(threadType: ThreadType, threadId: string, listener: (event: ThreadEvent) => void) {
  const name = channel(threadType, String(threadId))
  bus.on(name, listener)
  return () => {
    bus.off(name, listener)
  }
}
