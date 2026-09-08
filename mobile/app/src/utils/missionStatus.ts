/**
 * Mappings purs pour les libellés mission (provider).
 * Toutes les clés retournées doivent exister dans le namespace i18n
 * providerMissionDetails / providerMissionCompleted (fr/en/wo).
 */

/** Clé i18n du libellé humain d'un statut de mission (journal d'état). */
export function statusLabelKey(status: string): string {
  const map: Record<string, string> = {
    accepted: 'statusAccepted',
    assigned: 'statusAssigned',
    on_the_way: 'statusOnTheWay',
    provider_arriving: 'statusProviderArriving',
    arrived: 'statusArrived',
    in_progress: 'statusInProgress',
    paused: 'statusPaused',
    awaiting_validation: 'statusAwaitingValidation',
    completed: 'statusCompleted',
    cancelled: 'statusCancelled',
    dispute: 'statusDispute',
  }
  return map[status] || 'statusInProgress'
}

export type PaymentLabel = 'received' | 'secured' | 'pending' | 'failed' | null

/**
 * Traduit l'état réel du paiement backend en libellé d'affichage.
 * Ne jamais considérer une mission terminée comme payée :
 * seul payment.status fait foi.
 */
export function resolvePaymentLabel(payment?: { status?: string | null } | null): PaymentLabel {
  if (!payment || !payment.status) return null
  switch (payment.status) {
    case 'released':
      return 'received'
    case 'held':
      return 'secured'
    case 'pending':
      return 'pending'
    case 'failed':
    case 'refunded':
      return 'failed'
    default:
      return 'pending'
  }
}

export function paymentLabelI18nKey(label: PaymentLabel): string | null {
  switch (label) {
    case 'received':
      return 'providerMissionCompleted.paymentReceived'
    case 'secured':
      return 'providerMissionCompleted.paymentSecured'
    case 'pending':
      return 'providerMissionCompleted.paymentPendingConfirmation'
    case 'failed':
      return 'providerMissionCompleted.paymentFailed'
    default:
      return null
  }
}
