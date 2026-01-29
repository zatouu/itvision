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
          waveMerchantPhone: parsed?.providers?.manual?.waveMerchantPhone ?? DEFAULT_SETTINGS.providers.manual.waveMerchantPhone,
          orangeMerchantPhone: parsed?.providers?.manual?.orangeMerchantPhone ?? DEFAULT_SETTINGS.providers.manual.orangeMerchantPhone,
          instructions: parsed?.providers?.manual?.instructions ?? DEFAULT_SETTINGS.providers.manual.instructions
        },
        gateway: {
          active: Boolean(parsed?.providers?.gateway?.active ?? DEFAULT_SETTINGS.providers.gateway.active),
          provider: parsed?.providers?.gateway?.provider ?? DEFAULT_SETTINGS.providers.gateway.provider,
          apiKey: parsed?.providers?.gateway?.apiKey ?? DEFAULT_SETTINGS.providers.gateway.apiKey,
          apiSecret: parsed?.providers?.gateway?.apiSecret ?? DEFAULT_SETTINGS.providers.gateway.apiSecret,
          merchantId: parsed?.providers?.gateway?.merchantId ?? DEFAULT_SETTINGS.providers.gateway.merchantId
        },
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
    }
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(next, null, 2))
  return next
}
