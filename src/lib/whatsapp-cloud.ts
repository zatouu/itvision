/**
 * WhatsApp Business Platform (Cloud API officielle) — envoi de messages modèles approuvés par Meta
 * à des personnes ayant donné leur accord. Inactif tant que WHATSAPP_CLOUD_TOKEN et
 * WHATSAPP_PHONE_NUMBER_ID ne sont pas configurés.
 */

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'

export function isWhatsAppCloudConfigured(): boolean {
  return !!(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

/** Numéro au format international sans « + » ni espaces (ex. 221771234567). */
function toWaId(phone: string): string | null {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 9) return `221${digits}`
  if (digits.startsWith('00')) return digits.slice(2)
  return digits.length >= 11 ? digits : null
}

export async function sendWhatsAppTemplate(
  phone: string,
  template: string,
  bodyParams: string[],
  opts: { lang?: string; imageUrl?: string; buttonUrlSuffix?: string } = {}
): Promise<boolean> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const to = toWaId(phone)
  if (!token || !phoneId || !to) return false

  const components: any[] = []
  if (opts.imageUrl) components.push({ type: 'header', parameters: [{ type: 'image', image: { link: opts.imageUrl } }] })
  if (bodyParams.length) components.push({ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text: text.slice(0, 1000) })) })
  if (opts.buttonUrlSuffix) components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: opts.buttonUrlSuffix }] })

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name: template, language: { code: opts.lang || 'fr' }, components },
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) console.warn('[whatsapp-cloud] envoi refusé', res.status, (await res.text().catch(() => '')).slice(0, 300))
    return res.ok
  } catch (err) {
    console.warn('[whatsapp-cloud] envoi impossible', err instanceof Error ? err.message : err)
    return false
  }
}
