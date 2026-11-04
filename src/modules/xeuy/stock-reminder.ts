import ProviderProfile from '@/lib/models/ProviderProfile'
import { sendPushToUser } from '@/lib/push'
import { isDdmBridgeEnabled } from '@/lib/wallet'

const REMIND_EVERY_MS = 6 * 86400000
const BATCH = 500

// Au moins un consommable suivi (seuil > 0) au niveau ou sous son seuil
const HAS_LOW_STOCK = {
  $expr: {
    $gt: [{
      $size: {
        $filter: {
          input: { $ifNull: ['$stock', []] },
          cond: { $and: [{ $gt: ['$$this.minQty', 0] }, { $lte: ['$$this.qty', '$$this.minQty'] }] },
        },
      },
    }, 0],
  },
}

/** Rappel hebdomadaire aux prestataires dont des consommables sont sous leur seuil (une fois par semaine au plus). */
export async function remindLowStock(): Promise<number> {
  const since = new Date(Date.now() - REMIND_EVERY_MS)
  const profiles = await ProviderProfile.find({
    ...HAS_LOW_STOCK,
    $or: [{ stockReminderAt: { $exists: false } }, { stockReminderAt: null }, { stockReminderAt: { $lt: since } }],
  }).select('userId stock stockReminderAt').limit(BATCH).lean() as any[]
  if (!profiles.length) return 0

  const ddm = await isDdmBridgeEnabled()
  let sent = 0
  for (const p of profiles) {
    // Réservation avant envoi : deux instances ne notifient pas deux fois
    const claimed = await ProviderProfile.updateOne(
      { _id: p._id, stockReminderAt: p.stockReminderAt ?? null },
      { $set: { stockReminderAt: new Date() } }
    )
    if (claimed.modifiedCount !== 1) continue
    const low = (p.stock || []).filter((i: any) => i.minQty > 0 && i.qty <= i.minQty).map((i: any) => i.name)
    const list = low.slice(0, 3).join(', ') + (low.length > 3 ? '…' : '')
    void sendPushToUser(String(p.userId), {
      title: low.length > 1 ? `${low.length} consommables à racheter` : 'Consommable à racheter',
      body: `${list}${ddm ? ' · Rachat possible sur DDM+ au tarif pro.' : ''}`,
      data: { type: 'stock:low' },
      appType: 'provider',
    })
    sent++
  }
  return sent
}
