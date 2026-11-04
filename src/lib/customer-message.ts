import { sendSms } from '@/lib/sms'
import { isWhatsAppCloudConfigured, sendWhatsAppTemplate } from '@/lib/whatsapp-cloud'

/**
 * Message transactionnel au client : modèle WhatsApp officiel si le compte et le modèle sont configurés
 * (généralement moins cher qu'un SMS), sinon SMS. Le SMS reste le filet de sécurité si WhatsApp échoue.
 */
export async function sendCustomerMessage(
  phone: string,
  msg: { sms: string; whatsapp?: { template?: string; params: string[]; buttonUrlSuffix?: string } }
): Promise<'whatsapp' | 'sms' | 'none'> {
  const wa = msg.whatsapp
  if (wa?.template && isWhatsAppCloudConfigured()) {
    const ok = await sendWhatsAppTemplate(phone, wa.template, wa.params, { buttonUrlSuffix: wa.buttonUrlSuffix })
    if (ok) return 'whatsapp'
  }
  const sent = await sendSms(phone, msg.sms).catch(() => false)
  return sent ? 'sms' : 'none'
}
