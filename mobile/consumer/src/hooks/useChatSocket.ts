import { useEffect } from 'react'
import { joinMissionChat, leaveMissionChat, onChatMessage } from '../socket'

export function useChatSocket(requestId: string | null, callback: (message: any) => void) {
  useEffect(() => {
    if (!requestId) return
    joinMissionChat(requestId)
    const unsub = onChatMessage((msg) => {
      if (msg?.requestId === requestId) callback(msg)
    })
    return () => {
      unsub()
      leaveMissionChat(requestId)
    }
  }, [requestId])
}
