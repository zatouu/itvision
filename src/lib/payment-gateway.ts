import { PaymentSettings } from '@/lib/payments/settings'
import { PayDunyaService } from '@/lib/payment-providers/paydunya'

export type PaymentProviderId = PaymentSettings['providers']['gateway']['provider']

export type PaymentGatewayStatus = 'completed' | 'pending' | 'cancelled'

export interface PaymentCheckoutRequest {
  amount: number
  reference: string
  description: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  returnUrl: string
  cancelUrl: string
  callbackUrl: string
}

export interface PaymentCheckoutResult {
  provider: PaymentProviderId
  token: string
  url: string
}

export interface PaymentVerificationResult {
  provider: PaymentProviderId
  status: PaymentGatewayStatus
  amount: number
  reference: string
  paymentMethod?: string
  receiptUrl?: string
}

export interface PaymentGateway {
  provider: PaymentProviderId
  createCheckout(request: PaymentCheckoutRequest): Promise<PaymentCheckoutResult>
  verifyTransaction(token: string): Promise<PaymentVerificationResult>
}

class PayDunyaGateway implements PaymentGateway {
  provider: PaymentProviderId = 'paydunya'
  private service: PayDunyaService

  constructor(settings: PaymentSettings['providers']['gateway']) {
    this.service = new PayDunyaService(settings)
  }

  async createCheckout(request: PaymentCheckoutRequest): Promise<PaymentCheckoutResult> {
    const result = await this.service.createInvoice(request)
    return {
      provider: this.provider,
      token: result.token,
      url: result.url
    }
  }

  async verifyTransaction(token: string): Promise<PaymentVerificationResult> {
    const result = await this.service.verifyTransaction(token)
    return {
      provider: this.provider,
      status: result.status,
      amount: result.amount,
      reference: result.reference,
      paymentMethod: result.paymentMethod,
      receiptUrl: result.receiptUrl
    }
  }
}

export function getActivePaymentGateway(settings: PaymentSettings): PaymentGateway {
  const gatewaySettings = settings.providers.gateway

  if (!gatewaySettings.active) {
    throw new Error('Aucune passerelle de paiement active')
  }

  return getPaymentGateway(settings, gatewaySettings.provider)
}

export function getPaymentGateway(settings: PaymentSettings, provider: PaymentProviderId): PaymentGateway {
  const gatewaySettings = settings.providers.gateway

  switch (gatewaySettings.provider) {
    case 'paydunya':
      if (provider !== 'paydunya') break
      return new PayDunyaGateway(gatewaySettings)
    case 'stripe':
    case 'cinetpay':
      if (provider === gatewaySettings.provider) {
        throw new Error(`La passerelle ${provider} n'est pas encore implémentée`)
      }
      break
    default:
      break
  }

  throw new Error(`La passerelle ${provider} n'est pas configurée`)
}
