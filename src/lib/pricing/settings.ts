// Serveur uniquement : cacher le require à webpack/next pour éviter le bundling côté client
const _req: any = eval('require')
const fs: any = _req('fs')
const path: any = _req('path')

const FILE_PATH = path.resolve(process.cwd(), 'data', 'pricing-settings.json')

export interface ServiceFeeTierSetting {
  minAmount: number
  maxAmount?: number
  feeRate: number
  label: string
  description: string
}

export interface PricingDefaults {
  defaultExchangeRate: number
  defaultServiceFeeRate: number
  defaultInsuranceRate: number
  defaultB2BDiscountPercent: number
  serviceFeeTiers: ServiceFeeTierSetting[]
}

export const DEFAULT_SERVICE_FEE_TIERS: ServiceFeeTierSetting[] = [
  { minAmount: 0, maxAmount: 500_000, feeRate: 10, label: 'Standard', description: 'Frais standard pour commandes < 500 000 FCFA' },
  { minAmount: 500_000, maxAmount: 2_000_000, feeRate: 8, label: 'Volume', description: 'Réduction volume pour commandes 500k - 2M FCFA' },
  { minAmount: 2_000_000, maxAmount: 5_000_000, feeRate: 6, label: 'Pro', description: 'Tarif professionnel pour commandes 2M - 5M FCFA' },
  { minAmount: 5_000_000, feeRate: 5, label: 'Entreprise', description: 'Tarif entreprise pour commandes > 5M FCFA' }
]

const DEFAULTS: PricingDefaults = {
  defaultExchangeRate: 100,
  defaultServiceFeeRate: 10,
  defaultInsuranceRate: 2.5,
  defaultB2BDiscountPercent: 15,
  serviceFeeTiers: DEFAULT_SERVICE_FEE_TIERS
}

function ensureFile() {
  const dir = path.dirname(FILE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify(DEFAULTS, null, 2))
}

function normalizeServiceFeeTiers(raw: unknown, standardRateFallback: number): ServiceFeeTierSetting[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_SERVICE_FEE_TIERS

  const parsed = raw
    .map((item, index) => {
      const row = item as Partial<ServiceFeeTierSetting>
      const minAmount = Number(row.minAmount)
      const feeRate = Number(row.feeRate)

      if (!Number.isFinite(minAmount) || minAmount < 0) return null
      if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 100) return null

      const label = typeof row.label === 'string' && row.label.trim() ? row.label.trim() : `Palier ${index + 1}`
      const description = typeof row.description === 'string' && row.description.trim() ? row.description.trim() : `Palier ${index + 1}`

      return { minAmount: Math.round(minAmount), feeRate: Number(feeRate), label, description }
    })
    .filter((tier): tier is Omit<ServiceFeeTierSetting, 'maxAmount'> => tier !== null)
    .sort((a, b) => a.minAmount - b.minAmount)

  if (parsed.length === 0) return DEFAULT_SERVICE_FEE_TIERS

  const deduped: Omit<ServiceFeeTierSetting, 'maxAmount'>[] = []
  for (const tier of parsed) {
    if (deduped.length === 0 || tier.minAmount > deduped[deduped.length - 1].minAmount) {
      deduped.push(tier)
    }
  }

  if (deduped.length === 0) return DEFAULT_SERVICE_FEE_TIERS

  if (deduped[0].minAmount > 0) {
    deduped.unshift({
      minAmount: 0,
      feeRate: standardRateFallback,
      label: 'Standard',
      description: 'Palier standard'
    })
  } else {
    deduped[0] = { ...deduped[0], minAmount: 0 }
  }

  return deduped.map((tier, index) => ({
    ...tier,
    maxAmount: index < deduped.length - 1 ? deduped[index + 1].minAmount : undefined
  }))
}

function sanitizePricingDefaults(raw: unknown): PricingDefaults {
  const source = raw && typeof raw === 'object' ? (raw as Partial<PricingDefaults>) : {}

  const defaultExchangeRate = Number(source.defaultExchangeRate)
  const defaultServiceFeeRate = Number(source.defaultServiceFeeRate)
  const defaultInsuranceRate = Number(source.defaultInsuranceRate)
  const defaultB2BDiscountPercent = Number(source.defaultB2BDiscountPercent)

  const resolvedDefaultServiceFeeRate =
    Number.isFinite(defaultServiceFeeRate) && defaultServiceFeeRate >= 0 && defaultServiceFeeRate <= 100
      ? Number(defaultServiceFeeRate)
      : DEFAULTS.defaultServiceFeeRate

  return {
    defaultExchangeRate: Number.isFinite(defaultExchangeRate) && defaultExchangeRate > 0 ? Math.round(defaultExchangeRate) : DEFAULTS.defaultExchangeRate,
    defaultServiceFeeRate: resolvedDefaultServiceFeeRate,
    defaultInsuranceRate: Number.isFinite(defaultInsuranceRate) && defaultInsuranceRate >= 0 && defaultInsuranceRate <= 100 ? Number(defaultInsuranceRate) : DEFAULTS.defaultInsuranceRate,
    defaultB2BDiscountPercent:
      Number.isFinite(defaultB2BDiscountPercent) && defaultB2BDiscountPercent >= 1 && defaultB2BDiscountPercent <= 50
        ? Number(defaultB2BDiscountPercent)
        : DEFAULTS.defaultB2BDiscountPercent,
    serviceFeeTiers: normalizeServiceFeeTiers(source.serviceFeeTiers, resolvedDefaultServiceFeeRate)
  }
}

export function readPricingDefaults(): PricingDefaults {
  try {
    ensureFile()
    const raw = fs.readFileSync(FILE_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    return sanitizePricingDefaults({ ...DEFAULTS, ...parsed })
  } catch {
    return DEFAULTS
  }
}

export function writePricingDefaults(payload: Partial<PricingDefaults>) {
  try {
    ensureFile()
    const current = readPricingDefaults()
    const updated = sanitizePricingDefaults({ ...current, ...payload })
    fs.writeFileSync(FILE_PATH, JSON.stringify(updated, null, 2))
    return updated
  } catch (err) {
    throw err
  }
}
