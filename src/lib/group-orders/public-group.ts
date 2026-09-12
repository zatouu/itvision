/**
 * Sanitisation des achats groupés exposés publiquement.
 * Les documents GroupOrder contiennent PII participants (téléphone, email,
 * montants, statut de paiement, tokens chat) — jamais exposés tels quels.
 */

/** « Awa Diop » → « Awa D. » — même rendu que le masquage de l'écran détail. */
export function maskParticipantName(full?: string | null): string {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Participant'
  return parts[0] + (parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : '')
}

/** Liste publique : aucune identité participant, uniquement le compteur. */
export function sanitizePublicGroup(group: any) {
  return {
    groupId: group.groupId,
    status: group.status,
    product: group.product,
    minQty: group.minQty,
    targetQty: group.targetQty,
    currentQty: group.currentQty,
    maxQty: group.maxQty,
    priceTiers: group.priceTiers,
    currentUnitPrice: group.currentUnitPrice,
    deadline: group.deadline,
    shippingMethod: group.shippingMethod,
    shippingCostPerUnit: group.shippingCostPerUnit,
    participantCount: Array.isArray(group.participants) ? group.participants.length : 0,
  }
}

/** Détail public : participants masqués, sans montants ni statut de paiement. */
export function sanitizePublicGroupDetail(group: any) {
  return {
    ...sanitizePublicGroup(group),
    description: group.description,
    createdBy: group.createdBy ? { name: maskParticipantName(group.createdBy.name) } : undefined,
    createdAt: group.createdAt,
    participants: Array.isArray(group.participants)
      ? group.participants.map((p: any) => ({
          name: maskParticipantName(p.name),
          qty: p.qty,
          joinedAt: p.joinedAt,
        }))
      : [],
  }
}
