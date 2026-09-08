import { useEffect } from 'react'
import { onNewOffer, onCounterOffer } from '../socket'

export function useOffersSocket(requestId: string | null, callbacks: {
  onNew?: (offer: any) => void
  onCounter?: (offer: any) => void
}) {
  useEffect(() => {
    if (!requestId) return
    const unsubNew = onNewOffer((offer) => {
      if (offer?.requestId === requestId) callbacks.onNew?.(offer)
    })
    const unsubCounter = onCounterOffer((offer) => {
      if (offer?.requestId === requestId) callbacks.onCounter?.(offer)
    })
    return () => {
      unsubNew()
      unsubCounter()
    }
  }, [requestId])
}
