import { Platform, Alert } from 'react-native'
import * as FileSystem from 'expo-file-system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getAuthToken, getRefreshToken, getDeviceId, setAuth, clearAuth } from './auth'
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
  }
}

/** Réarmer l'intercepteur 401 après un (re)login */
export function resetUnauthorizedFlag() {
  _unauthorizedFired = false
}

// ─── Auto-refresh on 401 ────────────────────────────────────────────────────
let _isRefreshing = false
let _refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const res = await fetch(base + '/api/auth/mobile/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    if (!data.accessToken || !data.refreshToken) return false

    // Update stored tokens — need to get existing user
    const userStr = await AsyncStorage.getItem('authUser')
    const user = userStr ? JSON.parse(userStr) : null
    if (user) {
      await setAuth(data.accessToken, user, data.refreshToken, getDeviceId() || undefined)
    }
    return true
  } catch {
    return false
  }
}

/** Deduplicated refresh — multiple concurrent 401s share one refresh call */
export function performRefresh(): Promise<boolean> {
  if (_isRefreshing && _refreshPromise) return _refreshPromise
  _isRefreshing = true
  _refreshPromise = tryRefreshToken().finally(() => {
    _isRefreshing = false
    _refreshPromise = null
  })
  return _refreshPromise
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
      const delay = 300 * Math.pow(2, i) // 300ms, 600ms
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastErr ?? new Error('Échec après plusieurs tentatives')
}

async function handleStatus(r: Response, retryFn?: () => Promise<Response>): Promise<Response> {
  if (r.ok) return r
  const body = await r.json().catch(() => ({}))
  if (r.status === 401) {
    // Try auto-refresh before logging out
    if (retryFn && getRefreshToken()) {
      const refreshed = await performRefresh()
      if (refreshed) {
        const retryRes = await retryFn()
        if (retryRes.ok) return retryRes
        // Retry also failed — parse and throw
        const retryBody = await retryRes.json().catch(() => ({}))
        const msg = typeof retryBody.error === 'string' ? retryBody.error : 'Une erreur est survenue. Veuillez réessayer.'
        throw new Error(msg)
      }
    }
    if (_onUnauthorized) {
      _onUnauthorized()
    }
  }
  const msg =
    r.status === 401 ? 'Session expirée'
    : r.status === 403 ? 'Accès refusé'
    : r.status === 404 ? 'Ressource introuvable'
    : typeof body.error === 'string' ? body.error
    : 'Une erreur est survenue. Veuillez réessayer.'
  const err = new Error(msg) as Error & { code?: string }
  if (body.code) err.code = body.code
  if (r.status >= 500) captureError(err, { status: r.status, url: r.url })
  throw err
}

export async function apiGet(path: string, maxRetries = 2) {
  const doFetch = () => fetchWithRetry(base + path, {
    headers: authHeaders(),
  }, maxRetries)
  const r = await doFetch()
  const finalRes = await handleStatus(r, doFetch)
  return finalRes.json()
}

/** Alias for apiGet — kept for backward compatibility */
export async function apiGetRetry(path: string, maxRetries = 2) {
  return apiGet(path, maxRetries)
}

export async function apiPost(path: string, body: Record<string, unknown>) {
  const doFetch = () => fetchWithRetry(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }, 1)
  const r = await doFetch()
  const finalRes = await handleStatus(r, doFetch)
  return finalRes.json()
}

export async function apiPatch(path: string, body: Record<string, unknown>) {
  const doFetch = () => fetchWithRetry(base + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }, 1)
  const r = await doFetch()
  const finalRes = await handleStatus(r, doFetch)
  return finalRes.json()
}

export async function apiDelete(path: string) {
  const doFetch = () => fetchWithRetry(base + path, {
    method: 'DELETE',
    headers: authHeaders(),
  }, 1)
  const r = await doFetch()
  const finalRes = await handleStatus(r, doFetch)
  return finalRes.json()
}

export async function apiUpload(fileUri: string, filename: string, contentType: string, uploadType = 'requests') {
  if (Platform.OS === 'web') {
    const formData = new FormData()
    const blob = await fetch(fileUri).then(res => res.blob())
    ;(formData.append as any)('file', blob, filename)
    formData.append('type', uploadType)
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)
    try {
      const r = await fetch(base + '/api/upload', {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
        signal: controller.signal,
      })
      const finalRes = await handleStatus(r)
      return finalRes.json()
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
          type: uploadType,
        },
      }
    )
    let data
    try { data = JSON.parse(uploadResult.body) } catch { throw new Error('Réponse serveur invalide') }
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

/** Revoke refresh token on server before clearing local auth */
export async function logoutApi(): Promise<void> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return
  try {
    await fetch(base + '/api/auth/mobile/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    // Best-effort — logout should never fail client-side
  }
}
