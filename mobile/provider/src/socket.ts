import { io, Socket } from 'socket.io-client'
import { getToken, getBaseUrl } from './api'

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
    })

    socket.on('connect', () => {
      console.log('[WS] Provider connecté', socket?.id)
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

/** Emit provider GPS for geofencing (called periodically while online) */
export function emitGps(lat: number, lng: number) {
  socket?.emit('provider:gps', { lat, lng })
}

/** Listen for nearby request notifications (geofenced) */
export function onNearbyRequest(cb: (data: any) => void): () => void {
  const s = getSocket()
  s.on('request:nearby', cb)
  return () => { s.off('request:nearby', cb) }
}
