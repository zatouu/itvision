import { GroupOrder } from '@/lib/models/GroupOrder'
import GroupInterest from '@/lib/models/GroupInterest'
import { notifyAdmins } from '@/lib/notify'
import { sendSms } from '@/lib/sms'
import { isWhatsAppCloudConfigured, sendWhatsAppTemplate } from '@/lib/whatsapp-cloud'
import { MARKET_BRAND } from '@/lib/branding'
import { fcfa, groupAnnouncementText } from './announce-text'

export { groupAnnouncementText }

const MAX_RECIPIENTS = Number(process.env.GROUP_ANNOUNCE_MAX) > 0 ? Number(process.env.GROUP_ANNOUNCE_MAX) : 500

/**
 * Annonce d'un nouvel achat groupé ouvert :
 * - personnes « Préviens-moi » sur ce produit : SMS unique ;
 * - abonnés aux nouveaux groupes (scope global) : modèle WhatsApp officiel si configuré
 *   (WHATSAPP_TEMPLATE_NEW_GROUP), sinon SMS si GROUP_ANNOUNCE_SMS=true ;
 * - équipe : notification avec le kit de diffusion (texte + visuels) pour la Chaîne WhatsApp et TikTok.
 */
export async function announceNewGroup(groupId: string): Promise<void> {
  const g = await GroupOrder.findOne({ groupId }).lean() as any
  if (!g || g.status !== 'open') return

  const url = `${MARKET_BRAND.url}/achats-groupes/${g.groupId}`
  const name = String(g.product?.name || 'ce produit').slice(0, 60)
  const unit = g.currentUnitPrice || g.product?.basePrice || 0
  const joined = new Set((g.participants || []).map((p: any) => String(p.phone).replace(/\D/g, '').slice(-9)))
  const notJoined = (phone: string) => !joined.has(String(phone).replace(/\D/g, '').slice(-9))

  const productScope = g.product?.productId ? String(g.product.productId) : null
  if (productScope) {
    const interests = await GroupInterest.find({ scope: productScope, notified: false }).limit(MAX_RECIPIENTS).lean() as any[]
    for (const it of interests) {
      const claimed = await GroupInterest.updateOne({ _id: it._id, notified: false }, { $set: { notified: true } })
      if (claimed.modifiedCount !== 1 || !notJoined(it.phone)) continue
      await sendSms(it.phone, `${MARKET_BRAND.name} : achat groupé lancé sur ${name}, dès ${fcfa(unit)}/pièce et ça baisse avec le groupe. ${url}`).catch(() => false)
    }
  }

  const template = process.env.WHATSAPP_TEMPLATE_NEW_GROUP
  const useWhatsApp = isWhatsAppCloudConfigured() && !!template
  const useSms = !useWhatsApp && process.env.GROUP_ANNOUNCE_SMS === 'true'
  if (useWhatsApp || useSms) {
    const subscribers = await GroupInterest.find({ scope: 'global' }).select('phone').limit(MAX_RECIPIENTS).lean() as any[]
    const image = `${MARKET_BRAND.url}/api/og/group/${encodeURIComponent(g.groupId)}?format=card`
    for (const s of subscribers) {
      if (!notJoined(s.phone)) continue
      if (useWhatsApp) {
        // Modèle attendu : en-tête image, corps {{1}} produit {{2}} prix, bouton URL « …/achats-groupes/{{1}} »
        await sendWhatsAppTemplate(s.phone, template!, [name, fcfa(unit)], { imageUrl: image, buttonUrlSuffix: g.groupId })
      } else {
        await sendSms(s.phone, `${MARKET_BRAND.name} : nouvel achat groupé ${name}, dès ${fcfa(unit)}/pièce. ${url} (STOP : ${MARKET_BRAND.url}/achats-groupes/alertes)`).catch(() => false)
      }
    }
  }

  void notifyAdmins({
    type: 'info',
    title: 'Nouvel achat groupé : kit de diffusion prêt',
    message: `${name} — message, visuel et vidéo prêts pour la Chaîne WhatsApp et TikTok.`,
    actionUrl: '/admin/achats-groupes',
    metadata: { groupId: g.groupId },
  })
}
