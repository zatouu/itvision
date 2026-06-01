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
