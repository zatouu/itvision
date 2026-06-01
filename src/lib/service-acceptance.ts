import Offer from './models/Offer'
import { sendPushToUser, sendPushToUsers } from './push'
import { spendOnWonMission } from './wallet'

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

  sr.status = 'assigned'
  sr.assignedProviderId = offer.providerId
  sr.selectedOfferId = offer._id
  sr.assignedAt = new Date()
  await sr.save()

  await Offer.updateOne({ _id: offer._id }, { status: 'accepted' })
  await Offer.updateMany(
    { requestId: sr._id, _id: { $ne: offer._id }, status: 'submitted' },
    { status: 'rejected' }
  )

  let pointsCharged = 0
  try {
    const spend = await spendOnWonMission(providerId, requestId)
    pointsCharged = spend.charged
    if (!spend.ok && spend.reason === 'insufficient') {
      console.warn(`[wallet] Provider ${providerId} solde points insuffisant pour mission ${requestId} (solde: ${spend.balance})`)
    }
  } catch (walletErr) {
    console.error('[wallet] Erreur débit points mission', requestId, walletErr)
  }

  const io = (global as any).io
  if (io) {
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

  void sendPushToUser(providerId, {
    title: securePayment ? '✅ Offre acceptée + paiement sécurisé !' : '✅ Offre acceptée !',
    body: securePayment
      ? `Votre offre pour ${sr.category} a été retenue. Le paiement est sécurisé.`
      : `Votre offre pour ${sr.category} a été retenue. Rendez-vous mission.`,
    data: { type: 'offer:accepted', requestId, offerId },
  })

  if (notifyClientPaymentHeld && typeof amount === 'number') {
    void sendPushToUser(clientId, {
      title: '💳 Paiement sécurisé',
      body: `${amount.toLocaleString('fr-FR')} FCFA en escrow. Le prestataire est notifié.`,
      data: { type: 'payment:held', requestId },
    })
  }

  const loserIds = losingOffers.map((lo: any) => String(lo.providerId))
  if (loserIds.length > 0) {
    void sendPushToUsers(loserIds, {
      title: 'Offre non retenue',
      body: `Un autre prestataire a été choisi pour cette demande.`,
      data: { type: 'offer:rejected', requestId },
      sound: null,
    })
  }

  return { pointsCharged }
}
