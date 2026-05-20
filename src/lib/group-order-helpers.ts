/**
 * Helpers partagés pour les achats groupés.
 * Centralise la logique de génération de références de paiement
 * et l'envoi des notifications quand un groupe passe en "filled".
 */

import { notifyPaymentWithCheckoutLink } from './group-order-notifications'
import { formatSenegalPhone } from './payment-service'

function generatePaymentReference(groupId: string, participantPhone: string): string {
  const groupShort = groupId.slice(-6).toUpperCase()
  const phoneShort = participantPhone.replace(/\D/g, '').slice(-4)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `AG-${groupShort}-${phoneShort}-${random}`
}

/**
 * Génère les références de paiement manquantes pour tous les participants
 * et envoie les emails avec lien checkout.
 * À appeler quand group.status passe à 'filled'.
 *
 * Retourne le nombre de participants notifiés.
 */
export async function assignPaymentRefsAndNotify(group: any): Promise<number> {
  let modified = false
  let notified = 0

  const groupData = {
    groupId: group.groupId,
    product: group.product,
    currentQty: group.currentQty,
    targetQty: group.targetQty,
    currentUnitPrice: group.currentUnitPrice,
    deadline: group.deadline,
    shippingMethod: group.shippingMethod
  }

  for (const p of group.participants) {
    // Générer la ref si absente
    if (!p.paymentReference) {
      p.paymentReference = generatePaymentReference(
        group.groupId,
        formatSenegalPhone(p.phone) || p.phone
      )
      modified = true
    }

    // Envoyer l'email si participant a un email
    if (p.email) {
      try {
        await notifyPaymentWithCheckoutLink(
          {
            name: p.name,
            email: p.email,
            phone: p.phone,
            qty: p.qty,
            unitPrice: p.unitPrice,
            totalAmount: p.totalAmount,
            paymentReference: p.paymentReference
          },
          groupData
        )
        notified++
      } catch (err) {
        console.error(`[GroupHelper] Erreur notification ${p.email}:`, err)
      }
    }
  }

  if (modified) {
    await group.save()
  }

  console.log(`[GroupHelper] ${notified} participants notifiés pour ${group.groupId}`)
  return notified
}
