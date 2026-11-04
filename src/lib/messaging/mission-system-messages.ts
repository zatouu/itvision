import { postMessage, toMissionMessageDto } from '@/lib/messaging/thread-messages'
import { getIO } from '@/lib/socket-emit'

const STATUS_MESSAGES: Record<string, string> = {
  accepted: 'Offre acceptée : la mission est confirmée.',
  on_the_way: 'Le prestataire est en route.',
  arrived: 'Le prestataire est arrivé sur place.',
  in_progress: 'Intervention démarrée.',
  awaiting_validation: 'Le prestataire a terminé. Merci de valider la fin de la mission.',
  completed: 'Mission terminée et validée.',
  cancelled: 'Mission annulée.',
  dispute: 'Un litige a été ouvert. Notre équipe va intervenir.',
}

// Désactivé par défaut : les versions mobiles actuelles afficheraient ces messages comme venant de l'autre partie
export function missionSystemMessagesEnabled() {
  return process.env.MISSION_SYSTEM_MESSAGES === 'true'
}

/** Jalon de mission inscrit dans le fil de discussion (rendu spécifique via `systemEvent`). */
export async function postMissionSystemMessage(requestId: string, status: string) {
  if (!missionSystemMessagesEnabled()) return
  const text = STATUS_MESSAGES[status]
  if (!text) return
  const msg = await postMessage({
    threadType: 'mission',
    threadId: String(requestId),
    senderRole: 'system',
    systemEvent: `mission:${status}`,
    text,
  })
  getIO()?.to(`mission-${requestId}`).emit('chat:message', toMissionMessageDto(msg))
}
