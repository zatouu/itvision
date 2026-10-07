type MissionChatRole = 'client' | 'provider'

const PROVIDER_REPLIES: Record<string, string[]> = {
  accepted: ['Bonjour, je confirme la mission.', 'Pouvez-vous préciser l\'adresse exacte ?', 'Avez-vous une photo du problème ?'],
  on_the_way: ['Je suis en route.', 'J\'arrive dans 10 minutes.', 'Petit retard, j\'arrive bientôt.'],
  arrived: ['Je suis devant.', 'Pouvez-vous m\'ouvrir ?'],
  in_progress: ['Intervention en cours.', 'Il me faut une pièce supplémentaire.', 'Presque terminé.'],
  awaiting_validation: ['C\'est terminé, merci de valider la mission.'],
}

const CLIENT_REPLIES: Record<string, string[]> = {
  accepted: ['Bonjour, merci !', 'Je vous envoie une photo du problème.', 'À quelle heure pouvez-vous passer ?'],
  on_the_way: ['D\'accord, je vous attends.', 'Merci, à tout de suite.'],
  arrived: ['J\'arrive.', 'Je vous ouvre.'],
  in_progress: ['Merci, tenez-moi informé.'],
  awaiting_validation: ['Merci, je vérifie et je valide.'],
}

/** Suggestions de réponses rapides selon l'étape de la mission et le rôle. */
export function getMissionQuickReplies(status: string, role: MissionChatRole): string[] {
  const normalized = status === 'assigned' ? 'accepted' : status === 'provider_arriving' ? 'on_the_way' : status
  return (role === 'provider' ? PROVIDER_REPLIES : CLIENT_REPLIES)[normalized] || []
}
