// Serveur uniquement
const _req: any = eval('require')
const fs: any = _req('fs')
const path: any = _req('path')

import { PriceOverride } from '@/types/pricing'

const FILE_PATH = path.resolve(process.cwd(), 'data', 'price-overrides.json')

function ensureFile() {
  const dir = path.dirname(FILE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2))
}

export function readPriceOverrides(): PriceOverride[] {
  try {
    ensureFile()
    const content = fs.readFileSync(FILE_PATH, 'utf-8')
    const data = JSON.parse(content || '[]')
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Erreur lecture price-overrides.json', err)
    return []
  }
}

export function writePriceOverrides(overrides: PriceOverride[]): PriceOverride[] {
  try {
    ensureFile()
    fs.writeFileSync(FILE_PATH, JSON.stringify(overrides, null, 2))
    return overrides
  } catch (err) {
    console.error('Erreur écriture price-overrides.json', err)
    throw new Error('Impossible de sauvegarder les surcharges de prix')
  }
}
