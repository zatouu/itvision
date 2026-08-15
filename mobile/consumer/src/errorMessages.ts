/**
 * Maps backend business error codes and raw error messages to user-friendly French strings.
 * Never displays technical codes, i18n keys, or backend identifiers to the end user.
 */

const CODE_MESSAGES: Record<string, string> = {
  ALREADY_CANCELLED: 'Cette demande a déjà été annulée.',
  ALREADY_COMPLETED: 'Cette demande est déjà terminée.',
  ALREADY_EXPIRED: 'Le délai de cette demande est terminé.',
  CANNOT_CANCEL: 'Cette demande ne peut plus être annulée.',
  OFFER_ALREADY_ACCEPTED: 'Cette offre a déjà été traitée.',
  REQUEST_NOT_AVAILABLE: "Cette demande n'est plus disponible.",
  TRANSITION_FORBIDDEN: "Cette action n'est plus possible car la demande a évolué.",
}

const GENERIC_ERROR = 'Une erreur est survenue. Veuillez réessayer.'
const NETWORK_ERROR = 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.'

/**
 * Returns a human-readable error message from an error object.
 * Uses the business code if available, otherwise checks for network errors,
 * and falls back to a generic message.
 */
export function humanErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string }
  if (e?.code && CODE_MESSAGES[e.code]) {
    return CODE_MESSAGES[e.code]
  }

  const msg = e?.message || ''

  if (
    msg.includes('Réseau indisponible') ||
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('Délai dépassé') ||
    msg.includes('Failed to fetch')
  ) {
    return NETWORK_ERROR
  }

  if (msg.includes('Session expirée') || msg.includes('Non authentifié')) {
    return 'Votre session a expiré. Veuillez vous reconnecter.'
  }

  if (msg.includes('Accès refusé') || msg.includes('Interdit')) {
    return "Vous n'êtes pas autorisé à effectuer cette action."
  }

  if (msg.includes('Ressource introuvable') || msg.includes('introuvable')) {
    return "L'élément demandé est introuvable."
  }

  return GENERIC_ERROR
}
