// Serveur uniquement : cacher le require à webpack/next pour éviter le bundling côté client
const _req: any = eval('require')
const fs: any = _req('fs')
const path: any = _req('path')

const FILE_PATH = path.resolve(process.cwd(), 'data', 'pricing-settings.json')

export interface PricingDefaults {
  defaultExchangeRate: number
  defaultServiceFeeRate: number
  defaultInsuranceRate: number
  defaultMarginRate: number // Marge commerciale par défaut en %
}

const DEFAULTS: PricingDefaults = {
  defaultExchangeRate: 100,
  defaultServiceFeeRate: 10,
  defaultInsuranceRate: 2.5,
  defaultMarginRate: 25 // 25% de marge par défaut
}

function ensureFile() {
  const dir = path.dirname(FILE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify(DEFAULTS, null, 2))
}

export function readPricingDefaults(): PricingDefaults {
  try {
    ensureFile()
    const raw = fs.readFileSync(FILE_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...parsed }
  } catch (err) {
    return DEFAULTS
  }
}

export function writePricingDefaults(payload: Partial<PricingDefaults>) {
  try {
    ensureFile()
    const current = readPricingDefaults()
    const updated = { ...current, ...payload }
    fs.writeFileSync(FILE_PATH, JSON.stringify(updated, null, 2))
    return updated
  } catch (err) {
    throw err
  }
}

export default { readPricingDefaults, writePricingDefaults }
