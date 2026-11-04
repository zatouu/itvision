import { useCallback, useEffect, useRef } from 'react'
import { connectSocket, emitOfferTyping, emitRequestViewing, emitStopViewing } from '../socket'

const TYPING_IDLE_MS = 6000
const TYPING_REFRESH_MS = 8000

/**
 * Présence d'un prestataire sur une demande, relayée en direct au client :
 * « consulte votre demande » tant que l'écran est ouvert, « rédige une offre » pendant la saisie.
 * Le nom affiché est résolu par le serveur (aucune donnée personnelle envoyée d'ici).
 */
export function useOfferPresence(requestId: string | null | undefined, coords?: { lat: number; lng: number } | null) {
  const typing = useRef(false)
  const lastTypingEmit = useRef(0)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const coordsRef = useRef(coords)
  coordsRef.current = coords

  const stopTyping = useCallback(() => {
    if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null }
    if (typing.current && requestId) emitOfferTyping(requestId, false)
    typing.current = false
  }, [requestId])

  useEffect(() => {
    if (!requestId) return
    const socket = connectSocket()
    const announce = () => emitRequestViewing(requestId, undefined, coordsRef.current?.lat, coordsRef.current?.lng)
    announce()
    // Après une reconnexion le serveur a perdu l'état : on se réannonce
    socket.on('connect', announce)
    return () => {
      socket.off('connect', announce)
      if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null }
      if (typing.current) emitOfferTyping(requestId, false)
      typing.current = false
      emitStopViewing(requestId)
    }
  }, [requestId])

  /** À appeler à chaque saisie dans le formulaire d'offre. */
  const notifyTyping = useCallback(() => {
    if (!requestId) return
    const now = Date.now()
    if (!typing.current || now - lastTypingEmit.current > TYPING_REFRESH_MS) {
      emitOfferTyping(requestId, true)
      lastTypingEmit.current = now
      typing.current = true
    }
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS)
  }, [requestId, stopTyping])

  return { notifyTyping, stopTyping }
}
