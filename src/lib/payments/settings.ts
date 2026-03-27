// Serveur uniquement : cacher le require à webpack/next pour éviter le bundling côté client
const _req: any = eval('require')
const fs: any = _req('fs')
const path: any = _req('path')

const FILE_PATH = path.resolve(process.cwd(), 'data', 'payment-settings.json')

export type PaymentSettings = {
  groupOrders: {
    enabled: boolean
    chatEnabled: boolean
    paymentLinksEnabled: boolean
    paymentManagementEnabled: boolean
  },
  providers: {
    manual: {
      waveMerchantPhone: string
      orangeMerchantPhone: string
      instructions: string
    },
    gateway: {
      active: boolean
      provider: 'paydunya' | 'stripe' | 'cinetpay'
      apiKey: string
      apiSecret: string
      merchantId: string
    },
    escrow: {
      enabled: boolean
      holdPercentage: number
    }
  }
}

const DEFAULT_SETTINGS: PaymentSettings = {
  groupOrders: {
    enabled: true,
    chatEnabled: true,
    paymentLinksEnabled: true,
    paymentManagementEnabled: true
  },
  providers: {
    manual: {
      waveMerchantPhone: '+221770000000',
      orangeMerchantPhone: '+221760000000',
      instructions: "Paiement à la livraison ou retrait au bureau."
    },
    gateway: {
      active: false,
      provider: 'paydunya',
      apiKey: '',
      apiSecret: '',
      merchantId: ''
    },
    escrow: {
      enabled: true,
      holdPercentage: 100
    }
  }
}

function ensureFile() {
  const dir = path.dirname(FILE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2))
}

/**
 * Résout les clés PayDunya depuis les variables d'environnement (prioritaire) ou le fichier JSON.
 * Variables d'environnement supportées:
 *   PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN
 *   PAYDUNYA_MODE ('test' | 'live', défaut: 'live')
 * Si les 3 clés env sont présentes, la gateway s'active automatiquement.
 */
function resolveGatewayConfig(parsed: any): PaymentSettings['providers']['gateway'] {
  const envMaster  = process.env.PAYDUNYA_MASTER_KEY  || ''
  const envPrivate = process.env.PAYDUNYA_PRIVATE_KEY || ''
  const envToken   = process.env.PAYDUNYA_TOKEN       || ''
  const hasEnvKeys = !!(envMaster && envPrivate && envToken)

  const apiKey     = envMaster  || parsed?.providers?.gateway?.apiKey     || DEFAULT_SETTINGS.providers.gateway.apiKey
  const apiSecret  = envPrivate || parsed?.providers?.gateway?.apiSecret  || DEFAULT_SETTINGS.providers.gateway.apiSecret
  const merchantId = envToken   || parsed?.providers?.gateway?.merchantId || DEFAULT_SETTINGS.providers.gateway.merchantId

  // Auto-activation si les 3 clés sont présentes (env ou fichier)
  const keysPresent = !!(apiKey && apiSecret && merchantId)
  const explicitActive = parsed?.providers?.gateway?.active
  const active = typeof explicitActive === 'boolean' ? explicitActive : (hasEnvKeys || keysPresent)

  return {
    active,
    provider: parsed?.providers?.gateway?.provider ?? DEFAULT_SETTINGS.providers.gateway.provider,
    apiKey,
    apiSecret,
    merchantId
  }
}

export function readPaymentSettings(): PaymentSettings {
  try {
    ensureFile()
    const raw = fs.readFileSync(FILE_PATH, 'utf-8')
    const parsed = JSON.parse(raw)

    const settings: PaymentSettings = {
      groupOrders: {
        enabled: Boolean(parsed?.groupOrders?.enabled ?? DEFAULT_SETTINGS.groupOrders.enabled),
        chatEnabled: Boolean(parsed?.groupOrders?.chatEnabled ?? DEFAULT_SETTINGS.groupOrders.chatEnabled),
        paymentLinksEnabled: Boolean(parsed?.groupOrders?.paymentLinksEnabled ?? DEFAULT_SETTINGS.groupOrders.paymentLinksEnabled),
        paymentManagementEnabled: Boolean(parsed?.groupOrders?.paymentManagementEnabled ?? DEFAULT_SETTINGS.groupOrders.paymentManagementEnabled)
      },
      providers: {
        manual: {
          waveMerchantPhone: process.env.WAVE_MERCHANT_PHONE || parsed?.providers?.manual?.waveMerchantPhone || DEFAULT_SETTINGS.providers.manual.waveMerchantPhone,
          orangeMerchantPhone: process.env.ORANGE_MERCHANT_PHONE || parsed?.providers?.manual?.orangeMerchantPhone || DEFAULT_SETTINGS.providers.manual.orangeMerchantPhone,
          instructions: parsed?.providers?.manual?.instructions ?? DEFAULT_SETTINGS.providers.manual.instructions
        },
        gateway: resolveGatewayConfig(parsed),
        escrow: {
          enabled: Boolean(parsed?.providers?.escrow?.enabled ?? DEFAULT_SETTINGS.providers.escrow.enabled),
          holdPercentage: Number(parsed?.providers?.escrow?.holdPercentage ?? DEFAULT_SETTINGS.providers.escrow.holdPercentage)
        }
      }
    }

    return settings
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function writePaymentSettings(payload: Partial<PaymentSettings>): PaymentSettings {
  ensureFile()
  const current = readPaymentSettings()

  const next: PaymentSettings = {
    groupOrders: {
      enabled: typeof payload?.groupOrders?.enabled === 'boolean' ? payload.groupOrders.enabled : current.groupOrders.enabled,
      chatEnabled: typeof payload?.groupOrders?.chatEnabled === 'boolean' ? payload.groupOrders.chatEnabled : current.groupOrders.chatEnabled,
      paymentLinksEnabled:
        typeof payload?.groupOrders?.paymentLinksEnabled === 'boolean'
          ? payload.groupOrders.paymentLinksEnabled
          : current.groupOrders.paymentLinksEnabled,
      paymentManagementEnabled:
        typeof payload?.groupOrders?.paymentManagementEnabled === 'boolean'
          ? payload.groupOrders.paymentManagementEnabled
          : current.groupOrders.paymentManagementEnabled
    },
    providers: {
      manual: {
        waveMerchantPhone: payload.providers?.manual?.waveMerchantPhone ?? current.providers.manual.waveMerchantPhone,
        orangeMerchantPhone: payload.providers?.manual?.orangeMerchantPhone ?? current.providers.manual.orangeMerchantPhone,
        instructions: payload.providers?.manual?.instructions ?? current.providers.manual.instructions
      },
      gateway: {
        active: typeof payload.providers?.gateway?.active === 'boolean' ? payload.providers.gateway.active : current.providers.gateway.active,
        provider: payload.providers?.gateway?.provider ?? current.providers.gateway.provider,
        apiKey: payload.providers?.gateway?.apiKey ?? current.providers.gateway.apiKey,
        apiSecret: payload.providers?.gateway?.apiSecret ?? current.providers.gateway.apiSecret,
        merchantId: payload.providers?.gateway?.merchantId ?? current.providers.gateway.merchantId
      },
      escrow: {
        enabled: typeof payload.providers?.escrow?.enabled === 'boolean' ? payload.providers.escrow.enabled : current.providers.escrow.enabled,
        holdPercentage: payload.providers?.escrow?.holdPercentage ?? current.providers.escrow.holdPercentage
      }
    }
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(next, null, 2))
  return next
}
