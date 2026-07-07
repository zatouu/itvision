import { io, Socket } from 'socket.io-client'
import { getToken, getBaseUrl } from './api'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const token = getToken()
    if (!token) {
      // Retourne un socket déconnecté sans crash — sera recréé au login
      socket = io(getBaseUrl(), { autoConnect: false })
      return socket
    }
    socket = io(getBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })

    socket.on('connect', () => {
      console.log('[WS] Connecté', socket?.id)
    })
    socket.on('disconnect', (reason) => {
      console.log('[WS] Déconnecté:', reason)
    })
    socket.on('connect_error', (err) => {
      console.warn('[WS] Erreur connexion:', err.message)
    })
  }
  return socket
}

/** Force la recréation du socket (après login/logout). */
export function resetSocket(): void {
  socket?.disconnect()
  socket = null
}

export function connectSocket(): Socket {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
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

export function emitProviderLocation(requestId: string, location: { lat: number; lng: number; heading?: number | null }) {
  socket?.emit('provider:location', { requestId, ...location })
}

export function emitMissionStatus(requestId: string, status: string) {
  socket?.emit('mission:status_updated', { requestId, status })
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

export function requestOnlineProviders() {
  const s = connectSocket()
  s.emit('get-online-providers')
}

export function onOnlineProvidersCount(callback: (data: { count: number }) => void) {
  const s = connectSocket()
  s.on('online-providers-count', callback)
  return () => { s.off('online-providers-count', callback) }
}
