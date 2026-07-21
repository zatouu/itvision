import Offer from './models/Offer'
import ServiceRequest from './models/ServiceRequest'
import ChatMessage from './models/ChatMessage'
import { sendPushToUser, sendPushToUsers } from './push'
import { confirmMissionReservation, getAppConfig, releaseMissionReservation, spendOnWonMission } from './wallet'

type AcceptOfferArgs = {
  serviceRequest: any
  offer: any
  securePayment?: boolean
  notifyClientPaymentHeld?: boolean
  amount?: number
}

export async function acceptOfferForRequest(args: AcceptOfferArgs): Promise<{ pointsCharged: number }> {
  const { serviceRequest: sr, offer, securePayment = false, notifyClientPaymentHeld = false, amount } = args
  const requestId = String(sr._id)
  const offerId = String(offer._id)
  const providerId = String(offer.providerId)
  const clientId = String(sr.clientId)
  const losingOffers = await Offer.find({ requestId: sr._id, _id: { $ne: offer._id } }).select('_id providerId').lean()
  const cfg = await getAppConfig()

  // Utiliser le Mission Lifecycle Manager pour toute transition d'état.
  const lifecycle = await import('./mission-lifecycle')
  const acceptedRequest = await lifecycle.transition(String(sr._id), 'accepted', {
    actor: { userId: String(sr.clientId), role: 'client' },
    metadata: { acceptedOfferId: String(offer._id), assignedProviderId: String(offer.providerId) },
  })
  if (!acceptedRequest) {
    throw new Error('Mission déjà attribuée ou indisponible')
  }

  let pointsCharged = 0
  try {
    if (cfg.credits?.unlockEnabled === true) {
      const reservation = await confirmMissionReservation(providerId, requestId)
      if (!reservation.ok) {
        throw new Error('Réservation de crédits introuvable ou invalide pour ce prestataire')
      }
      pointsCharged = reservation.charged
    } else {
      const spend = await spendOnWonMission(providerId, requestId)
      if (!spend.ok) {
        throw new Error('Crédits insuffisants pour attribuer cette mission')
      }
      pointsCharged = spend.charged
    }
  } catch (error) {
    await ServiceRequest.updateOne(
      { _id: sr._id, status: 'accepted', selectedOfferId: offer._id },
      {
        $set: { status: 'broadcasted' },
        $unset: { assignedProviderId: 1, selectedOfferId: 1, assignedAt: 1 },
      }
    )
    throw error
  }

  sr.status = acceptedRequest.status
  sr.assignedProviderId = acceptedRequest.assignedProviderId
  sr.selectedOfferId = acceptedRequest.selectedOfferId
  sr.assignedAt = acceptedRequest.assignedAt

  await Offer.updateOne({ _id: offer._id }, { status: 'accepted' })
  await Offer.updateMany(
    { requestId: sr._id, _id: { $ne: offer._id }, status: 'submitted' },
    { status: 'rejected' }
  )

  await Promise.all(losingOffers.map(async (losingOffer: any) => {
    try {
      await releaseMissionReservation(String(losingOffer.providerId), requestId, 'Offre non retenue')
    } catch (releaseErr) {
      console.error('[wallet] Erreur libération réservation mission', requestId, releaseErr)
    }
  }))

  const io = (global as any).io

  // Premier message de chat : description de la demande, pour que le prestataire
  // voit le contexte sans retourner dans les demandes proches.
  let initialChatMessage: any = null
  const description = sr.description?.trim()
  if (description) {
    const existing = await ChatMessage.findOne({ requestId: sr._id }).lean()
    if (!existing) {
      initialChatMessage = await ChatMessage.create({
        requestId: sr._id,
        senderId: clientId,
        senderRole: 'client',
        text: description,
      })
    }
  }

  if (initialChatMessage) {
    const lifecycle = await import('./mission-lifecycle')
    await lifecycle.touch(requestId, 'chat', clientId)
  }

  if (io) {
    if (initialChatMessage) {
      const payload = {
        _id: String(initialChatMessage._id),
        requestId,
        senderId: clientId,
        senderRole: 'client',
        text: initialChatMessage.text,
        createdAt: initialChatMessage.createdAt,
      }
      io.to(`mission-${requestId}`).emit('chat:message', payload)
      io.to(`provider-${providerId}`).emit('chat:message', payload)
    }
    io.to(`provider-${providerId}`).emit('offer:accepted', {
      offerId,
      requestId,
      category: sr.category,
      location: sr.location,
    })
    for (const lo of losingOffers) {
      io.to(`provider-${lo.providerId}`).emit('offer:rejected', {
        offerId: String(lo._id),
        requestId,
      })
    }
    io.to(`request-${requestId}`).emit('request:assigned', {
      requestId,
      acceptedOfferId: offerId,
    })
    io.to(`user-${clientId}`).emit('user:request-assigned', {
      requestId,
      acceptedOfferId: offerId,
    })
  }

  await sendPushToUser(providerId, {
    title: securePayment ? '✅ Offre acceptée + paiement sécurisé !' : '✅ Offre acceptée !',
    body: securePayment
      ? `Votre offre pour ${sr.category} a été retenue. Le paiement est sécurisé.`
      : `Votre offre pour ${sr.category} a été retenue. Rendez-vous mission.`,
    data: { type: 'offer:accepted', requestId, offerId },
    appType: 'provider',
  })

  if (notifyClientPaymentHeld && typeof amount === 'number') {
    await sendPushToUser(clientId, {
      title: '💳 Paiement sécurisé',
      body: `${amount.toLocaleString('fr-FR')} FCFA en escrow. Le prestataire est notifié.`,
      data: { type: 'payment:held', requestId },
      appType: 'consumer',
    })
  }

  const loserIds = losingOffers.map((lo: any) => String(lo.providerId))
  if (loserIds.length > 0) {
    await sendPushToUsers(loserIds, {
      title: 'Offre non retenue',
      body: `Un autre prestataire a été choisi pour cette demande.`,
      data: { type: 'offer:rejected', requestId },
      sound: null,
      appType: 'provider',
    })
  }

  return { pointsCharged }
}
