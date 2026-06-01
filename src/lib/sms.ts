/**
 * Service SMS pluggable.
 *
 * En dev : affiche l'OTP dans la console (pas d'envoi réel).
 * En prod : utilise Twilio (ou Orange SMS API — à brancher).
 *
 * Variables d'env attendues en prod :
 *   SMS_PROVIDER=twilio
 *   TWILIO_ACCOUNT_SID=...
 *   TWILIO_AUTH_TOKEN=...
 *   TWILIO_FROM_NUMBER=+221...
 */

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'console'

export async function sendSms(to: string, body: string): Promise<boolean> {
  const provider = SMS_PROVIDER.toLowerCase()

  if (provider === 'twilio') {
    return sendViaTwilio(to, body)
  }

  // Fallback dev : log console
  console.log(`\n📱 ===== SMS (DEV) =====`)
  console.log(`   To:   ${to}`)
  console.log(`   Body: ${body}`)
  console.log(`   =======================\n`)
  return true
}

async function sendViaTwilio(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const auth = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER

  if (!sid || !auth || !from) {
    console.error('[SMS] Twilio non configuré — SID/AUTH_TOKEN/FROM manquants')
    return false
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
    const params = new URLSearchParams({ To: to, From: from, Body: body })
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${sid}:${auth}`).toString('base64'),
      },
      body: params.toString(),
    })
    if (!r.ok) {
      const err = await r.text()
      console.error('[SMS] Twilio error:', r.status, err)
      return false
    }
    return true
  } catch (err) {
    console.error('[SMS] Twilio exception:', err)
    return false
  }
}

/**
 * Normalise un numéro de téléphone sénégalais.
 * Accepte : 77 123 45 67, +221771234567, 221771234567, 0771234567
 * Retourne : +221771234567
 */
export function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-().]/g, '')

  // Déjà en format international
  if (/^\+221[7-8]\d{8}$/.test(cleaned)) return cleaned

  // Sans le +
  if (/^221[7-8]\d{8}$/.test(cleaned)) return '+' + cleaned

  // Format local 7X ou 8X (9 chiffres)
  if (/^[7-8]\d{8}$/.test(cleaned)) return '+221' + cleaned

  // Avec 0 devant
  if (/^0[7-8]\d{8}$/.test(cleaned)) return '+221' + cleaned.slice(1)

  return null
}
