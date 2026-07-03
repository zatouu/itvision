import { useEffect } from 'react'
import { onMissionStatus, onProviderLocation } from '../socket'

export function useMissionSocket(requestId: string | null, callbacks: {
  onStatus?: (status: string) => void
  onLocation?: (lat: number, lng: number) => void
}) {
  useEffect(() => {
    if (!requestId) return
    const unsubStatus = onMissionStatus((data) => {
      if (data.requestId === requestId) callbacks.onStatus?.(data.status)
    })
    const unsubLocation = onProviderLocation((data) => {
      if (data.requestId === requestId) callbacks.onLocation?.(data.lat, data.lng)
    })
    return () => {
      unsubStatus()
      unsubLocation()
    }
  }, [requestId])
}
