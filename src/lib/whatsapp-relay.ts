import { connectMongoose } from './mongoose'
import User from './models/User'
import { getAppConfig } from './wallet'
import { isWhatsAppCloudConfigured, sendWhatsAppTemplate } from './whatsapp-cloud'
import { relayEventForType } from './whatsapp-relay-events'

// Plafond de coût : au plus un message WhatsApp par utilisateur et par événement sur cette fenêtre.
const COOLDOWN_MS = 10 * 60 * 1000
const lastSent = new Map<string, number>()

/**
 * Relais WhatsApp d'une notification Xeuy importante, en complément du push (pas en doublon) :
 * envoyé seulement si le push n'a atteint aucun appareil, si l'événement est activé dans l'admin
 * et si l'utilisateur a accepté les messages WhatsApp.
 */
export async function relayToWhatsApp(
  userId: string,
  message: { title: string; body: string; data?: Record<string, any> },
  pushDelivered: number
): Promise<boolean> {
  if (pushDelivered > 0 || !isWhatsAppCloudConfigured()) return false
  const event = relayEventForType(message.data?.type)
  if (!event) return false

  const cfg: any = await getAppConfig()
  const relay = cfg.integrations?.whatsappRelay
  if (relay?.enabled !== true || relay?.events?.[event] === false) return false

  const key = `${userId}:${event}`
  const now = Date.now()
  if (now - (lastSent.get(key) || 0) < COOLDOWN_MS) return false

  await connectMongoose()
  const user = await User.findById(userId).select('phone privacy').lean() as any
  if (!user?.phone || user.privacy?.whatsappNotifications !== true) return false

  lastSent.set(key, now)
  const template = process.env.WHATSAPP_TEMPLATE_NOTIFICATION || 'xeuy_notification'
  return sendWhatsAppTemplate(user.phone, template, [message.title, message.body])
}
