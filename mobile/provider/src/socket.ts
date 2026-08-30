import { io, Socket } from 'socket.io-client'
import { getToken, getBaseUrl, apiPost, performRefresh } from './api'
import { getRefreshToken } from './auth'

let _refreshing = false

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const token = getToken()
    if (!token) {
      socket = io(getBaseUrl(), { autoConnect: false })
      return socket
    }
    socket = io(getBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    })

    socket.on('connect', () => {
      console.log('[WS] Provider connecté', socket?.id)
      socket!.emit('join-provider-channel')
    })
    socket.on('disconnect', (reason) => {
      console.log('[WS] Déconnecté:', reason)
    })
    socket.on('connect_error', async (err) => {
      console.warn('[WS] Erreur connexion:', err.message)
      // If token expired, try to refresh and reconnect
      if (err.message?.includes('token') || err.message?.includes('exp') || err.message?.includes('unauthorized')) {
        if (!_refreshing && getRefreshToken()) {
          _refreshing = true
          try {
            const ok = await performRefresh()
            if (ok) {
              console.log('[WS] Token refreshed — reconnecting socket')
              resetSocket()
              connectSocket()
            }
          } catch {}
          _refreshing = false
        }
      }
    })
  }
  return socket
}

/** Force la recréation du socket (après login/logout). */
export function resetSocket(): void {
  socket?.emit('leave-provider-channel')
  socket?.disconnect()
  socket = null
}

export function connectSocket(): Socket {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  socket?.emit('leave-provider-channel')
  socket?.disconnect()
  socket = null
}

export function joinRequestRoom(requestId: string) {
  const s = connectSocket()
  s.emit('join-request-room', requestId)
}

export function leaveRequestRoom(requestId: string) {
  socket?.emit('leave-request-room', requestId)
}

export function joinMissionChat(requestId: string) {
  const s = connectSocket()
  s.emit('join-mission-chat', requestId)
}

export function leaveMissionChat(requestId: string) {
  socket?.emit('leave-mission-chat', requestId)
}

export function emitProviderLocation(requestId: string, location: { lat: number; lng: number; heading?: number | null; speed?: number | null }) {
  socket?.emit('provider:location', { requestId, ...location })
}

/** Signal that provider is viewing a request detail (presence viewers) */
export function emitRequestViewing(requestId: string, providerName?: string, lat?: number, lng?: number) {
  socket?.emit('request:viewing', { requestId, providerName, lat, lng })
}

/** Signal that provider stopped viewing a request detail */
export function emitStopViewing(requestId: string) {
  socket?.emit('request:stop-viewing', { requestId })
}

async function fallbackPostGps(lat: number, lng: number, status?: string) {
  try {
    await apiPost('/api/provider/location', { lat, lng, status })
  } catch {}
}

/** Emit provider GPS for geofencing (called periodically while app is foregrounded) */
export function emitGps(lat: number, lng: number, status?: string) {
  const s = connectSocket()
  s.emit('provider:gps', { lat, lng, status })
  // Si le socket n'est pas connecté (ex: server.js non utilisé, standalone Next.js),
  // on persiste la position via HTTP pour que le Visibility Engine puisse l'utiliser.
  if (!s.connected) {
    fallbackPostGps(lat, lng, status)
  }
}

/** Listen for nearby request notifications (geofenced) */
export function onNearbyRequest(cb: (data: any) => void): () => void {
  const s = getSocket()
  s.on('request:nearby', cb)
  return () => { s.off('request:nearby', cb) }
}

export function joinOffersRoom(requestId: string) {
  const s = connectSocket()
  s.emit('join-offers-room', requestId)
}

export function leaveOffersRoom(requestId: string) {
  socket?.emit('leave-offers-room', requestId)
}

export function joinNearbyRoom(lat: number, lng: number, radiusKm = 10) {
  const s = connectSocket()
  s.emit('join-nearby-room', { lat, lng, radiusKm })
}

export function leaveNearbyRoom() {
  socket?.emit('leave-nearby-room')
}

export function emitMissionStatus(requestId: string, status: string) {
  socket?.emit('mission:status_updated', { requestId, status })
}

export function emitOfferTyping(requestId: string, isTyping: boolean, providerName?: string) {
  socket?.emit('offer:typing', { requestId, isTyping, providerName })
}

export function onOfferTyping(callback: (data: { requestId: string; providerId: string; providerName?: string; isTyping: boolean }) => void) {
  const s = getSocket()
  s.on('offer:typing', callback)
  return () => { s.off('offer:typing', callback) }
}

export function onMissionStatus(callback: (data: { requestId: string; status: string }) => void) {
  const s = connectSocket()
  s.on('mission:status_updated', callback)
  return () => { s.off('mission:status_updated', callback) }
}

export function onProviderLocation(callback: (data: { requestId: string; lat: number; lng: number }) => void) {
  const s = connectSocket()
  s.on('mission:provider_location', callback)
  return () => { s.off('mission:provider_location', callback) }
}

export function onNewOffer(callback: (offer: any) => void) {
  const s = connectSocket()
  s.on('offer:new', callback)
  return () => { s.off('offer:new', callback) }
}

export function onCounterOffer(callback: (offer: any) => void) {
  const s = connectSocket()
  s.on('offer:counter', callback)
  return () => { s.off('offer:counter', callback) }
}

export function onOfferAccepted(callback: (data: any) => void) {
  const s = connectSocket()
  s.on('offer:accepted', callback)
  return () => { s.off('offer:accepted', callback) }
}

export function onOfferRejected(callback: (data: any) => void) {
  const s = connectSocket()
  s.on('offer:rejected', callback)
  return () => { s.off('offer:rejected', callback) }
}

export function onMissionStatusChanged(callback: (data: { requestId: string; status: string }) => void) {
  const s = connectSocket()
  s.on('mission:status-changed', callback)
  return () => { s.off('mission:status-changed', callback) }
}

export function onNotification(callback: (notification: any) => void) {
  const s = connectSocket()
  s.on('notification:new', callback)
  return () => { s.off('notification:new', callback) }
}

export function onChatMessage(callback: (message: any) => void) {
  const s = connectSocket()
  s.on('chat:message', callback)
  return () => { s.off('chat:message', callback) }
}
