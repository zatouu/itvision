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

export type PaymentProvider = 'wave' | 'orange_money' | 'free_money'

export interface InitiateResult {
  success: boolean
  externalId: string
  checkoutUrl?: string // URL to redirect user for payment approval
  error?: string
}

export interface ReleaseResult {
  success: boolean
  error?: string
}

const isDev = process.env.NODE_ENV !== 'production'

// ──── WAVE ────────────────────────────────────────────────────────────────────

async function waveInitiate(amount: number, clientPhone: string, description: string): Promise<InitiateResult> {
  if (isDev) {
    console.log(`[Payment/Wave] DEV: hold ${amount} XOF from ${clientPhone}`)
    return { success: true, externalId: `wave_dev_${Date.now()}`, checkoutUrl: `https://pay.wave.com/dev?amount=${amount}` }
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
      orderId: `ligey_${Date.now()}`,
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
  }
}
