import { useEffect } from 'react'
import { connectSocket } from '../socket'

export function useProviderPresenceSocket(lat: number, lng: number) {
  useEffect(() => {
    const socket = connectSocket()
    socket.emit('provider:presence', { lat, lng, online: true })
    return () => {
      socket.emit('provider:presence', { lat, lng, online: false })
    }
  }, [lat, lng])
}
