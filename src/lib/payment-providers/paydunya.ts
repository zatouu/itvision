import { PaymentSettings } from '@/lib/payments/settings'

interface PayDunyaConfig {
  masterKey: string
  privateKey: string
  token: string
  mode: 'test' | 'live'
}

export interface PayDunyaInvoice {
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

export interface PayDunyaCreateResult {
  token: string
  url: string
}

export type PayDunyaTransactionStatus = 'completed' | 'pending' | 'cancelled'

export interface PayDunyaVerifyResult {
  status: PayDunyaTransactionStatus
  amount: number
  reference: string
  paymentMethod?: string
  receiptUrl?: string
}

export class PayDunyaService {
  private config: PayDunyaConfig
  private baseUrl: string

  constructor(settings: PaymentSettings['providers']['gateway']) {
    const mode = (process.env.PAYDUNYA_MODE as 'test' | 'live') || 'live'
    this.config = {
      masterKey: settings.apiKey,
      privateKey: settings.apiSecret,
      token: settings.merchantId,
      mode
    }
    // PayDunya utilise le même endpoint, le mode dépend des clés
    this.baseUrl = 'https://app.paydunya.com/api/v1'
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': this.config.masterKey,
      'PAYDUNYA-PRIVATE-KEY': this.config.privateKey,
      'PAYDUNYA-TOKEN': this.config.token
    }
  }

  async createInvoice(invoice: PayDunyaInvoice): Promise<PayDunyaCreateResult> {
    const storeName = process.env.PAYDUNYA_STORE_NAME || 'IT Vision Plus'

    const payload = {
      invoice: {
        total_amount: invoice.amount,
        description: invoice.description,
        // Canaux de paiement activés pour le Sénégal
        channels: [
          'card',                   // Visa / Mastercard
          'orange-money-senegal',   // Orange Money SN
          'wave-senegal',           // Wave SN
          'free-money-senegal'      // Free Money SN
        ]
      },
      store: {
        name: storeName,
        tagline: 'Marketplace - Import Chine & Solutions IT',
        phone: invoice.customerPhone || '',
        postal_address: 'Dakar, Sénégal'
      },
      custom_data: {
        reference: invoice.reference,
        customer_name: invoice.customerName || '',
        customer_phone: invoice.customerPhone || '',
        customer_email: invoice.customerEmail || ''
      },
      actions: {
        return_url: invoice.returnUrl,
        cancel_url: invoice.cancelUrl,
        callback_url: invoice.callbackUrl
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/checkout-invoice/create`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('[PayDunya] Create Invoice Error:', { status: response.status, data })
        throw new Error(data.response_text || `PayDunya HTTP ${response.status}`)
      }

      if (data.response_code !== '00') {
        console.error('[PayDunya] Create Invoice Rejected:', data)
        throw new Error(data.response_text || 'PayDunya a refusé la transaction')
      }

      // PayDunya retourne le token et l'URL de checkout
      const checkoutUrl = data.response_text || data.checkout_url || data.invoice_url
      if (!checkoutUrl) {
        console.error('[PayDunya] No checkout URL in response:', data)
        throw new Error('URL de paiement non reçue de PayDunya')
      }

      return {
        token: data.token,
        url: checkoutUrl
      }

    } catch (error: any) {
      if (error.message?.includes('PayDunya') || error.message?.includes('HTTP')) throw error
      console.error('[PayDunya] Network Exception:', error)
      throw new Error('Impossible de contacter le serveur de paiement. Réessayez dans quelques instants.')
    }
  }

  /**
   * Vérifie le statut d'une transaction via le token PayDunya.
   * Appel server-to-server plus fiable que le hash IPN.
   */
  async verifyTransaction(token: string): Promise<PayDunyaVerifyResult> {
    try {
      const response = await fetch(`${this.baseUrl}/checkout-invoice/confirm/${token}`, {
        method: 'GET',
        headers: this.headers()
      })

      if (!response.ok) {
        console.error(`[PayDunya] Verify HTTP ${response.status} for token ${token}`)
        throw new Error('Impossible de vérifier la transaction PayDunya')
      }

      const data = await response.json()

      const statusMap: Record<string, PayDunyaTransactionStatus> = {
        'completed': 'completed',
        'pending': 'pending',
        'cancelled': 'cancelled',
        'failed': 'cancelled'
      }

      return {
        status: statusMap[data.status] || 'pending',
        amount: data.invoice?.total_amount ?? 0,
        reference: data.custom_data?.reference ?? '',
        paymentMethod: data.customer?.payment_type || data.payment_method || undefined,
        receiptUrl: data.receipt_url || undefined
      }
    } catch (error) {
      console.error('[PayDunya] Verify Error:', error)
      return { status: 'pending', amount: 0, reference: '' }
    }
  }

  /**
   * Vérifie la signature IPN PayDunya
   */
  verifyIpnHash(receivedHash: string, transactionData: string): boolean {
    try {
      const crypto = require('crypto')
      const computed = crypto
        .createHash('sha512')
        .update(this.config.masterKey + transactionData + this.config.privateKey)
        .digest('hex')
      return computed === receivedHash
    } catch {
      return false
    }
  }
}
