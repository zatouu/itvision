import { Platform, Alert } from 'react-native'
import * as FileSystem from 'expo-file-system'
import { getAuthToken } from './auth'
import { enqueue, isNetworkError, replay, startNetInfoReplay } from './offlineQueue'
import type { HttpMethod, ReplayResult } from './offlineQueue'
import { captureError } from './sentry'

const base = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'

// ─── 401 unauthorized callback ───────────────────────────────────────────────
// Set from _layout.tsx to avoid circular dependency (api → socket → api)
let _onUnauthorized: (() => void) | null = null
let _unauthorizedFired = false

export function setOnUnauthorized(handler: () => void) {
  _onUnauthorized = () => {
    if (_unauthorizedFired) return
    _unauthorizedFired = true
    handler()
    setTimeout(() => { _unauthorizedFired = false }, 3000)
  }
}

export function getToken(): string | null { return getAuthToken() }
export function getBaseUrl(): string { return base }

const TIMEOUT_MS = 20_000
const UPLOAD_TIMEOUT_MS = 60_000

function authHeaders(): Record<string, string> {
  const t = getAuthToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (e: unknown) {
    if ((e as { name?: string }).name === 'AbortError') throw new Error('Délai dépassé — le serveur met trop de temps à répondre')
    throw new Error('Réseau indisponible — vérifiez que le serveur est démarré')
  } finally {
    clearTimeout(id)
  }
}

async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 2): Promise<Response> {
  let lastErr: Error | null = null
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetchWithTimeout(url, options)
    } catch (e: unknown) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      if (i === maxRetries) break
      const delay = 300 * Math.pow(2, i)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastErr ?? new Error('Échec après plusieurs tentatives')
}

async function handleStatus(r: Response) {
  if (r.ok) return
  const body = await r.json().catch(() => ({}))
  if (r.status === 401 && _onUnauthorized) {
    _onUnauthorized()
  }
  const msg =
    r.status === 401 ? 'Session expirée — veuillez vous reconnecter'
    : r.status === 403 ? 'Accès refusé'
    : r.status === 404 ? 'Ressource introuvable'
    : body.error || `Erreur serveur (${r.status})`
  const err = new Error(msg)
  if (r.status >= 500) captureError(err, { status: r.status, url: r.url })
  throw err
}

export async function apiGet(path: string, maxRetries = 2) {
  const r = await fetchWithRetry(base + path, {
    headers: authHeaders(),
  }, maxRetries)
  await handleStatus(r)
  return r.json()
}

/** Alias for apiGet — kept for backward compatibility */
export async function apiGetRetry(path: string, maxRetries = 2) {
  return apiGet(path, maxRetries)
}

export async function apiPost(path: string, body: Record<string, unknown>) {
  const r = await fetchWithTimeout(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  await handleStatus(r)
  return r.json()
}

export async function apiPatch(path: string, body: Record<string, unknown>) {
  const r = await fetchWithTimeout(base + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  await handleStatus(r)
  return r.json()
}

export async function apiUpload(fileUri: string, filename: string, contentType: string) {
  if (Platform.OS === 'web') {
    const formData = new FormData()
    const blob = await fetch(fileUri).then(res => res.blob())
    ;(formData.append as any)('file', blob, filename)
    formData.append('type', 'requests')
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)
    try {
      const r = await fetch(base + '/api/upload', {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
        signal: controller.signal,
      })
      await handleStatus(r)
      return r.json()
    } catch (e: unknown) {
      if ((e as { name?: string }).name === 'AbortError') throw new Error('Délai upload dépassé — connexion trop lente')
      throw e
    } finally {
      clearTimeout(id)
    }
  } else {
    const uploadResult = await FileSystem.uploadAsync(
      base + '/api/upload',
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: contentType,
        headers: authHeaders(),
        parameters: {
          type: 'requests',
        },
      }
    )
    const data = JSON.parse(uploadResult.body)
    if (uploadResult.status >= 400) throw new Error(data.error || `Erreur upload (${uploadResult.status})`)
    return data
  }
}

// ─── Offline-queue wrappers ─────────────────────────────────────────────────

export async function apiPostQueued(
  path: string,
  body: Record<string, unknown>,
  offlineMsg = 'Action enregistr\u00e9e hors ligne.'
): Promise<unknown | null> {
  try {
    return await apiPost(path, body)
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      await enqueue({ method: 'POST', path, body })
      Alert.alert('Hors ligne', offlineMsg)
      return null
    }
    throw err
  }
}

export async function apiPatchQueued(
  path: string,
  body: Record<string, unknown>,
  offlineMsg = 'Action enregistr\u00e9e hors ligne.'
): Promise<unknown | null> {
  try {
    return await apiPatch(path, body)
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      await enqueue({ method: 'PATCH', path, body })
      Alert.alert('Hors ligne', offlineMsg)
      return null
    }
    throw err
  }
}

// ─── Replay lifecycle ───────────────────────────────────────────────────────

const queueExecutor = async (method: HttpMethod, path: string, body: Record<string, unknown>) => {
  if (method === 'POST') return apiPost(path, body)
  return apiPatch(path, body)
}

export async function replayOfflineQueue(): Promise<ReplayResult> {
  return replay(queueExecutor)
}

export function initOfflineReplay(): () => void {
  // Replay immédiat au démarrage
  replayOfflineQueue().then(r => {
    if (r.replayed > 0) console.log(`[Queue] ${r.replayed} action(s) rejou\u00e9e(s) au d\u00e9marrage`)
  }).catch(() => {})
  // Listener NetInfo pour replay automatique au retour réseau
  return startNetInfoReplay(queueExecutor)
}

export async function checkBackend(): Promise<boolean> {
  try {
    const r = await fetchWithTimeout(base + '/api/health')
    return r.ok
  } catch {
    return false
  }
}
