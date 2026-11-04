'use client'

/**
 * File d'envoi hors ligne de l'espace technicien (IndexedDB) : photos, compte rendu et changement de statut
 * saisis sans réseau, envoyés dans l'ordre au retour de la connexion.
 */

export type OutboxPhoto = Blob | string

export interface OutboxItem {
  id: string
  interventionId: string
  title?: string
  createdAt: number
  photosAvant: OutboxPhoto[]
  photosApres: OutboxPhoto[]
  observations?: string
  signatureClient?: { name: string; title: string; signature: string }
  signatureTechnicien?: { name: string; signature: string }
  status?: 'in_progress' | 'completed'
  gps?: { lat: number; lng: number } | null
}

export interface FlushResult {
  sent: number
  remaining: number
  /** Raison de l'arrêt : réseau, session expirée ou limite de débit (les éléments restent en file) */
  stopped?: 'network' | 'auth' | 'rate-limit' | 'server'
  rejected: string[]
}

const DB_NAME = 'itv-tech'
const STORE = 'outbox'
export const OUTBOX_EVENT = 'itv-tech-outbox'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode)
      const req = run(t.objectStore(STORE))
      t.oncomplete = () => resolve(req.result)
      t.onerror = () => reject(t.error)
      t.onabort = () => reject(t.error)
    })
  } finally {
    db.close()
  }
}

function changed() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OUTBOX_EVENT))
}

export function outboxSupported(): boolean {
  return typeof indexedDB !== 'undefined'
}

export async function listOutbox(): Promise<OutboxItem[]> {
  if (!outboxSupported()) return []
  const items = await tx<OutboxItem[]>('readonly', s => s.getAll() as IDBRequest<OutboxItem[]>)
  return items.sort((a, b) => a.createdAt - b.createdAt)
}

async function saveItem(item: OutboxItem) {
  await tx('readwrite', s => s.put(item))
}

async function removeItem(id: string) {
  await tx('readwrite', s => s.delete(id))
}

export async function enqueueOutbox(item: Omit<OutboxItem, 'id' | 'createdAt'>): Promise<void> {
  await saveItem({ ...item, id: crypto.randomUUID(), createdAt: Date.now() })
  changed()
}

/** Erreur réseau (fetch rejeté) : distincte d'une réponse HTTP du serveur. */
export function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError
}

type Outcome = { kind: 'ok' } | { kind: 'stop'; reason: NonNullable<FlushResult['stopped']> } | { kind: 'reject'; message: string }

function classify(res: Response, message: string): Outcome {
  if (res.ok) return { kind: 'ok' }
  if (res.status === 401) return { kind: 'stop', reason: 'auth' }
  if (res.status === 429) return { kind: 'stop', reason: 'rate-limit' }
  if (res.status >= 500 || res.status === 408) return { kind: 'stop', reason: 'server' }
  return { kind: 'reject', message }
}

async function send(item: OutboxItem, rejections: string[]): Promise<Outcome> {
  // 1. Photos encore sur l'appareil : chaque URL obtenue est sauvegardée aussitôt (pas de double envoi)
  for (const key of ['photosAvant', 'photosApres'] as const) {
    for (let n = 0; n < item[key].length; n++) {
      const photo = item[key][n]
      if (typeof photo === 'string') continue
      const fd = new FormData()
      fd.append('file', photo, `photo-${n}.jpg`)
      fd.append('type', 'interventions')
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const d = await res.json().catch(() => ({}))
      const outcome = classify(res, d.error || 'Photo refusée')
      if (outcome.kind === 'stop') return outcome
      if (outcome.kind === 'ok' && d.url) item[key][n] = d.url
      else {
        item[key].splice(n--, 1)
        rejections.push(outcome.kind === 'reject' ? outcome.message : 'Photo refusée')
      }
      await saveItem(item)
    }
  }

  // 2. Compte rendu (le serveur ignore les photos déjà rattachées et une signature déjà enregistrée)
  const photosAvant = item.photosAvant.filter((p): p is string => typeof p === 'string')
  const photosApres = item.photosApres.filter((p): p is string => typeof p === 'string')
  if (photosAvant.length || photosApres.length || item.observations || item.signatureClient || item.signatureTechnicien) {
    const res = await fetch('/api/tech/interventions/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        interventionId: item.interventionId,
        photosAvant: photosAvant.map(url => ({ url })),
        photosApres: photosApres.map(url => ({ url })),
        observations: item.observations,
        signatureClient: item.signatureClient,
        signatureTechnicien: item.signatureTechnicien,
      }),
    })
    const d = await res.json().catch(() => ({}))
    const outcome = classify(res, d.error || 'Compte rendu refusé')
    if (outcome.kind === 'stop') return outcome
    if (outcome.kind === 'reject') rejections.push(outcome.message)
    Object.assign(item, { photosAvant: [], photosApres: [], observations: undefined, signatureClient: undefined, signatureTechnicien: undefined })
    await saveItem(item)
  }

  // 3. Statut, avec l'heure réelle de l'action ; 409 = déjà fait ou plus applicable
  if (item.status) {
    const res = await fetch('/api/interventions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        interventionId: item.interventionId,
        status: item.status,
        occurredAt: new Date(item.createdAt).toISOString(),
        ...(item.gps ? { gps: item.gps } : {}),
      }),
    })
    if (res.status !== 409) {
      const d = await res.json().catch(() => ({}))
      const outcome = classify(res, d.error || 'Changement de statut refusé')
      if (outcome.kind !== 'ok') return outcome
    }
  }
  return { kind: 'ok' }
}

let running: Promise<FlushResult> | null = null

/** Envoie la file dans l'ordre ; s'arrête au premier problème réseau, de session ou de débit. */
export function flushOutbox(): Promise<FlushResult> {
  if (running) return running
  running = (async () => {
    const result: FlushResult = { sent: 0, remaining: 0, rejected: [] }
    if (!outboxSupported()) return result
    const items = await listOutbox()
    for (let n = 0; n < items.length; n++) {
      const item = items[n]
      const rejections: string[] = []
      let outcome: Outcome
      try {
        outcome = await send(item, rejections)
      } catch (e) {
        outcome = { kind: 'stop', reason: isNetworkError(e) ? 'network' : 'server' }
      }
      if (outcome.kind === 'stop') {
        result.stopped = outcome.reason
        result.remaining = items.length - n
        break
      }
      if (outcome.kind === 'reject') rejections.push(outcome.message)
      for (const message of rejections) result.rejected.push(`${item.title || 'Intervention'} : ${message}`)
      if (!rejections.length) result.sent++
      await removeItem(item.id)
    }
    changed()
    return result
  })().finally(() => { running = null })
  return running
}
