import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Vérification de signature pour les webhooks Mobile Money.
 *
 * Chaque provider envoie un secret partagé configuré côté serveur :
 * - WAVE_WEBHOOK_SECRET : secret HMAC pour Wave (header "wave-signature" ou "authorization")
 * - OM_WEBHOOK_SECRET : secret pour Orange Money (hash dans le body ou header)
 * - FREE_MONEY_WEBHOOK_SECRET : clé API Free Money (header "x-api-key")
 *
 * En dev (NODE_ENV !== production), tous les webhooks sont acceptés.
 */

const isDev = process.env.NODE_ENV !== 'production' || process.env.PAYMENTS_MOCK === 'true'

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8')
    const bufB = Buffer.from(b, 'utf-8')
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

function hmacSha256(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload, 'utf-8').digest('hex')
}

export interface WebhookVerifyResult {
  valid: boolean
  provider?: 'wave' | 'orange_money' | 'free_money' | 'unknown'
  error?: string
}

/**
 * Vérifie la signature d'un webhook entrant.
 * Retourne { valid: true } si la signature est correcte ou si on est en dev.
 */
export function verifyWebhookSignature(
  headers: Headers,
  rawBody: string,
): WebhookVerifyResult {
  if (isDev) {
    return { valid: true, provider: 'unknown' }
  }

  // ─── Wave : header "wave-signature" ou "authorization" ───
  const waveSecret = process.env.WAVE_WEBHOOK_SECRET
  if (waveSecret) {
    const waveSignature = headers.get('wave-signature') || ''
    const authHeader = headers.get('authorization') || ''

    if (waveSignature) {
      const expected = hmacSha256(waveSecret, rawBody)
      if (safeCompare(waveSignature, expected)) {
        return { valid: true, provider: 'wave' }
      }
      return { valid: false, provider: 'wave', error: 'Invalid Wave signature' }
    }

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      if (safeCompare(token, waveSecret)) {
        return { valid: true, provider: 'wave' }
      }
      return { valid: false, provider: 'wave', error: 'Invalid Wave bearer token' }
    }
  }

  // ─── Orange Money : hash dans le body ou header ───
  const omSecret = process.env.OM_WEBHOOK_SECRET
  if (omSecret) {
    const omHash = headers.get('x-om-hash') || ''
    if (omHash) {
      const expected = hmacSha256(omSecret, rawBody)
      if (safeCompare(omHash, expected)) {
        return { valid: true, provider: 'orange_money' }
      }
      return { valid: false, provider: 'orange_money', error: 'Invalid OM hash' }
    }
  }

  // ─── Free Money : header "x-api-key" ───
  const freeSecret = process.env.FREE_MONEY_WEBHOOK_SECRET
  if (freeSecret) {
    const apiKey = headers.get('x-api-key') || ''
    if (apiKey) {
      if (safeCompare(apiKey, freeSecret)) {
        return { valid: true, provider: 'free_money' }
      }
      return { valid: false, provider: 'free_money', error: 'Invalid Free Money API key' }
    }
  }

  // Aucun secret configuré → on rejette en prod
  if (!waveSecret && !omSecret && !freeSecret) {
    console.error('[Webhook] Aucun secret webhook configuré (WAVE_WEBHOOK_SECRET, OM_WEBHOOK_SECRET, FREE_MONEY_WEBHOOK_SECRET)')
    return { valid: false, provider: 'unknown', error: 'No webhook secret configured' }
  }

  // Des secrets sont configurés mais aucune signature reconnue
  return { valid: false, provider: 'unknown', error: 'Unrecognized webhook signature' }
}
