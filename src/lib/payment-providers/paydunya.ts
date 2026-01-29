import { PaymentSettings } from '@/lib/payments/settings'

interface PayDunyaConfig {
  masterKey: string
  privateKey: string
  token: string
  mode: 'test' | 'live'
}

interface PayDunyaInvoice {
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

export class PayDunyaService {
  private config: PayDunyaConfig
  // PayDunya ne distingue pas vraiment l'URL de base test/live pour l'API checkout standard, 
  // c'est les clés qui définissent le mode, mais on garde l'URL standard.
  private baseUrl = 'https://app.paydunya.com/api/v1'

  constructor(settings: PaymentSettings['providers']['gateway']) {
    this.config = {
      masterKey: settings.apiKey,
      privateKey: settings.apiSecret,
      token: settings.merchantId,
      mode: 'live' // Idéalement, on ajouterait un flag 'mode' dans les settings, on assume live ou test selon les clés
    }
  }

  async createInvoice(invoice: PayDunyaInvoice) {
    const payload = {
      invoice: {
        total_amount: invoice.amount,
        description: invoice.description,
        channels: ['card', 'orange-money-senegal', 'wave-senegal', 'free-money-senegal'] // Canaux activés
      },
      store: {
        name: 'IT Vision Plus',
        tagline: 'Sécurité Électronique & Solutions IT',
        phone: invoice.customerPhone, // Optionnel mais utile pour le reçu
        postal_address: 'Dakar, Sénégal'
      },
      custom_data: {
        reference: invoice.reference,
        customer_name: invoice.customerName,
        customer_phone: invoice.customerPhone
      },
      actions: {
        return_url: invoice.returnUrl,
        cancel_url: invoice.cancelUrl,
        callback_url: invoice.callbackUrl
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/checkout-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PAYDUNYA-MASTER-KEY': this.config.masterKey,
          'PAYDUNYA-PRIVATE-KEY': this.config.privateKey,
          'PAYDUNYA-TOKEN': this.config.token
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('PayDunya Error:', data)
        throw new Error(data.response_text || 'Erreur lors de l\'initialisation PayDunya')
      }

      if (data.response_code !== '00') {
         throw new Error(data.response_text || 'PayDunya a refusé la transaction')
      }

      return {
         token: data.token,
         url: data.response_text // PayDunya retourne l'URL de redirection dans response_text lors du succès (checkout-invoice)
      }

    } catch (error: any) {
      console.error('PayDunya Exception:', error)
      throw new Error(error.message || 'Erreur de communication avec PayDunya')
    }
  }

  /**
   * Vérifie l'intégrité d'une notification IPN (Callback)
   * PayDunya envoie un hash SHA512 des données reçues + la clé privée.
   * Note: Pour simplifier ici, on va souvent faire un appel 'confirm' status check server-to-server
   * si le hash n'est pas fiable ou difficile à calculer sans raw body.
   * 
   * Alternative plus robuste: Faire un "Confirm" sur l'API avec le token reçu.
   */
  async verifyTransaction(token: string): Promise<{ status: 'completed' | 'pending' | 'cancelled', amount: number, reference: string }> {
      try {
        const response = await fetch(`${this.baseUrl}/checkout-invoice/confirm/${token}`, {
            method: 'GET',
            headers: {
              'PAYDUNYA-MASTER-KEY': this.config.masterKey,
              'PAYDUNYA-PRIVATE-KEY': this.config.privateKey,
              'PAYDUNYA-TOKEN': this.config.token
            }
        })
        
        if (!response.ok) {
            throw new Error('Impossible de vérifier la transaction PayDunya')
        }

        const data = await response.json()
        
        // Mapping status
        // PayDunya status: 'completed', 'pending', 'cancelled'
        const statusMap: Record<string, 'completed' | 'pending' | 'cancelled'> = {
            'completed': 'completed',
            'pending': 'pending',
            'cancelled': 'cancelled',
            'failed': 'cancelled'
        }
        
        return { 
            status: statusMap[data.status] || 'pending', 
            amount: data.invoice.total_amount,
            reference: data.custom_data.reference
        }
      } catch (error) {
          console.error('PayDunya Verify Error:', error)
          // Fallback safe
          return { status: 'pending', amount: 0, reference: '' }
      }
  }
  
  /**
   * Calcule le hash attendu pour valider l'IPN
   * (Requiert 'crypto' natif Node.js)
   */
  computeHash(data: any): string {
    const crypto = require('crypto')
    // Le hash PayDunya est sha512(data.token + privateKey) souvent? 
    // Vérifier la doc: hash = sha512(master_key + params_stringify_sorted + private_key)... complexe.
    // Plus simple: PayDunya envoie son propre hash dans les headers ou body.
    
    // Pour ce prototype, on va se concentrer sur l'initialisation.
    return '' 
  }
}
