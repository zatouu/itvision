/**
 * Payment adapters for Senegalese Mobile Money providers.
 * 
 * Flow:
 * 1. Client accepts offer → initiate payment (hold)
 * 2. Provider delivers service → mission completed → release payment
 * 3. Client cancels → refund
 * 
 * In dev mode, all calls are mocked with instant success.
 */

export type PaymentProvider = 'wave' | 'orange_money' | 'free_money' | 'cash' | 'wave_qr'

export interface InitiateResult {
  success: boolean
  externalId: string
  checkoutUrl?: string // URL to redirect user for payment approval
  manualConfirm?: boolean // true = validation manuelle admin requise (QR statique)
  error?: string
}

export interface ReleaseResult {
  success: boolean
  error?: string
}

// Mock automatique en dev OU si PAYMENTS_MOCK=true (utile pour tests E2E en prod sans compte marchand)
const isDev = process.env.NODE_ENV !== 'production' || process.env.PAYMENTS_MOCK === 'true'
console.log(`[Payment] Mode: ${isDev ? 'MOCK (paiements simulés)' : 'PROD (Wave/OM/Free Money réels)'} — NODE_ENV=${process.env.NODE_ENV} PAYMENTS_MOCK=${process.env.PAYMENTS_MOCK}`)

// ──── WAVE ────────────────────────────────────────────────────────────────────

async function waveInitiate(amount: number, clientPhone: string, description: string): Promise<InitiateResult> {
  // En dev/mock : auto-success comme OM et Free Money (pas de validation manuelle)
  if (isDev) {
    console.log(`[Payment/Wave] DEV: hold ${amount} XOF from ${clientPhone}`)
    return { success: true, externalId: `wave_dev_${Date.now()}` }
  }
  // Sans clé API Wave en prod : bascule sur le flux QR manuel
  if (!process.env.WAVE_API_KEY) {
    console.log(`[Payment/Wave] No API key → manual QR flow for ${amount} XOF`)
    return waveQrInitiate(amount, clientPhone, description)
  }

  const res = await fetch('https://api.wave.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WAVE_API_KEY}`,
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: 'XOF',
      error_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/error`,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
      client_reference: `ligey_${Date.now()}`,
    }),
  })
  const data = await res.json()
  if (!res.ok) return { success: false, externalId: '', error: data.message || 'Wave error' }
  return {
    success: true,
    externalId: data.id,
    checkoutUrl: data.wave_launch_url,
  }
}

async function waveRelease(externalId: string, _amount: number, _providerPhone: string): Promise<ReleaseResult> {
  if (isDev) {
    console.log(`[Payment/Wave] DEV: release ${externalId}`)
    return { success: true }
  }
  // Wave auto-releases to merchant account on successful checkout
  // For marketplace: use Wave Payout API to send to provider
  const res = await fetch('https://api.wave.com/v1/payout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WAVE_API_KEY}`,
    },
    body: JSON.stringify({
      receive_amount: String(_amount),
      currency: 'XOF',
      mobile: _providerPhone,
      client_reference: externalId,
    }),
  })
  const data = await res.json()
  if (!res.ok) return { success: false, error: data.message || 'Payout failed' }
  return { success: true }
}

// ──── ORANGE MONEY ────────────────────────────────────────────────────────────

async function omInitiate(amount: number, clientPhone: string, description: string): Promise<InitiateResult> {
  if (isDev) {
    console.log(`[Payment/OM] DEV: hold ${amount} XOF from ${clientPhone}`)
    return { success: true, externalId: `om_dev_${Date.now()}`, checkoutUrl: undefined }
  }

  const res = await fetch(`${process.env.OM_API_URL}/merchant/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OM_API_TOKEN}`,
    },
    body: JSON.stringify({
      amount,
      currency: 'OUV',
      orderId: `xeuy_${Date.now()}`,
      description,
      notifUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/webhook`,
      customerMsisdn: clientPhone,
    }),
  })
  const data = await res.json()
  if (!res.ok) return { success: false, externalId: '', error: data.message || 'OM error' }
  return { success: true, externalId: data.payToken || data.transactionId || '' }
}

async function omRelease(externalId: string, amount: number, providerPhone: string): Promise<ReleaseResult> {
  if (isDev) {
    console.log(`[Payment/OM] DEV: release ${externalId} → ${providerPhone}`)
    return { success: true }
  }
  const res = await fetch(`${process.env.OM_API_URL}/cashout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OM_API_TOKEN}`,
    },
    body: JSON.stringify({
      amount,
      receiverMsisdn: providerPhone,
      reference: externalId,
    }),
  })
  const data = await res.json()
  if (!res.ok) return { success: false, error: data.message || 'OM payout error' }
  return { success: true }
}

// ──── FREE MONEY ──────────────────────────────────────────────────────────────

async function freeInitiate(amount: number, clientPhone: string, description: string): Promise<InitiateResult> {
  if (isDev) {
    console.log(`[Payment/Free] DEV: hold ${amount} XOF from ${clientPhone}`)
    return { success: true, externalId: `free_dev_${Date.now()}`, checkoutUrl: undefined }
  }

  const res = await fetch(`${process.env.FREE_MONEY_API_URL}/payment/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.FREE_MONEY_API_KEY || '',
    },
    body: JSON.stringify({
      amount,
      phone: clientPhone,
      description,
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/webhook`,
    }),
  })
  const data = await res.json()
  if (!res.ok) return { success: false, externalId: '', error: data.message || 'Free Money error' }
  return { success: true, externalId: data.transactionId || '' }
}

async function freeRelease(externalId: string, amount: number, providerPhone: string): Promise<ReleaseResult> {
  if (isDev) {
    console.log(`[Payment/Free] DEV: release ${externalId} → ${providerPhone}`)
    return { success: true }
  }
  const res = await fetch(`${process.env.FREE_MONEY_API_URL}/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.FREE_MONEY_API_KEY || '',
    },
    body: JSON.stringify({
      amount,
      receiver: providerPhone,
      reference: externalId,
    }),
  })
  const data = await res.json()
  if (!res.ok) return { success: false, error: data.message || 'Free Money payout error' }
  return { success: true }
}

// ──── CASH ────────────────────────────────────────────────────────────────────

async function cashInitiate(amount: number, clientPhone: string, description: string): Promise<InitiateResult> {
  if (isDev) {
    console.log(`[Payment/Cash] DEV: cash payment registered for ${amount} XOF`)
  }
  return { success: true, externalId: `cash_${Date.now()}` }
}

async function cashRelease(externalId: string, _amount: number, _providerPhone: string): Promise<ReleaseResult> {
  if (isDev) {
    console.log(`[Payment/Cash] DEV: cash release ${externalId}`)
  }
  return { success: true }
}


// ────── WAVE QR STATIQUE (validation manuelle admin) ──────
// Le client scanne le QR marchand de la boutique ou envoie au numéro marchand.
// Aucune API : le paiement arrive sur le compte Wave Business, un admin confirme.

async function waveQrInitiate(_amount: number, _clientPhone: string, _description: string): Promise<InitiateResult> {
  // En dev/mock : auto-success (pas de validation manuelle admin)
  if (isDev) {
    console.log(`[Payment/WaveQR] DEV: auto-confirm ${_amount} XOF`)
    return { success: true, externalId: `waveqr_dev_${Date.now()}` }
  }
  // En prod : le client scanne le QR marchand, un admin confirme réception
  return {
    success: true,
    externalId: `waveqr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    manualConfirm: true,
  }
}

async function waveQrRelease(externalId: string, _amount: number, providerPhone: string): Promise<ReleaseResult> {
  // Reversement manuel depuis le compte Wave Business de la boutique
  console.log(`[Payment/WaveQR] Manual release ${externalId} -> ${providerPhone} (${_amount} XOF)`)
  return { success: true }
}
// ──── PUBLIC API ──────────────────────────────────────────────────────────────

export async function initiatePayment(
  provider: PaymentProvider,
  amount: number,
  clientPhone: string,
  description: string,
): Promise<InitiateResult> {
  switch (provider) {
    case 'wave': return waveInitiate(amount, clientPhone, description)
    case 'orange_money': return omInitiate(amount, clientPhone, description)
    case 'free_money': return freeInitiate(amount, clientPhone, description)
    case 'cash': return cashInitiate(amount, clientPhone, description)
    case 'wave_qr': return waveQrInitiate(amount, clientPhone, description)
  }
}

export async function releasePayment(
  provider: PaymentProvider,
  externalId: string,
  amount: number,
  providerPhone: string,
): Promise<ReleaseResult> {
  switch (provider) {
    case 'wave': return waveRelease(externalId, amount, providerPhone)
    case 'orange_money': return omRelease(externalId, amount, providerPhone)
    case 'free_money': return freeRelease(externalId, amount, providerPhone)
    case 'cash': return cashRelease(externalId, amount, providerPhone)
    case 'wave_qr': return waveQrRelease(externalId, amount, providerPhone)
  }
}
