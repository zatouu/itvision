import { MongoClient } from 'mongodb'
import mongoose from 'mongoose'
import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { z } from 'zod'
import AppConfig from '../src/lib/models/AppConfig'
import { getConfiguredInternalShippingCosts } from '../src/lib/shipping/settings'
import { initializeSharedShippingCosts, shippingCostsSnapshotSchema } from '../src/lib/shipping/shared-costs'
import { initializeSharedPricing, sharedPricingConfigSchema, sharedPricingSnapshotSchema, shippingRatesSchema, seaEligibilitySchema } from '../src/lib/pricing/shared-settings'
import { DEFAULT_PRICING_SETTINGS } from '../src/lib/pricing/settings'
import { pricingDefaultsUpdateSchema } from '../src/lib/validation'
import { BASE_SHIPPING_RATES, type ShippingMethodId } from '../src/lib/logistics'
import { SOURCE_CURRENCY_RATES } from '../src/lib/pricing/constants'
import { DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS } from '../src/lib/shipping/sea-freight-eligibility'

function readLegacy(name: string): unknown {
  const path = resolve(process.cwd(), 'data', name)
  if (!existsSync(path)) return undefined
  const data = JSON.parse(readFileSync(path, 'utf8'))
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`Fichier invalide : ${path}`)
  return data
}

function legacyPricing() {
  const defaults = readLegacy('pricing-settings.json')
  const overrides = shippingRatesSchema.partial().parse(readLegacy('shipping-rates.json') ?? {})
  const adjust = z.object({ tolerance: z.number().finite().min(0).max(0.5) }).strict().parse(readLegacy('shipping-adjust.json') ?? {
    tolerance: process.env.SHIPPING_ADJUST_TOLERANCE ? Number(process.env.SHIPPING_ADJUST_TOLERANCE) : 0.1,
  })
  return sharedPricingConfigSchema.parse({
    defaults: { ...DEFAULT_PRICING_SETTINGS, ...(defaults === undefined ? {} : pricingDefaultsUpdateSchema.parse(defaults)) },
    sourceCurrencyRates: SOURCE_CURRENCY_RATES,
    shippingRates: Object.fromEntries((Object.keys(BASE_SHIPPING_RATES) as ShippingMethodId[]).map(method => [method, { rate: BASE_SHIPPING_RATES[method].rate, minimumCharge: BASE_SHIPPING_RATES[method].minimumCharge, ...overrides[method] }])),
    seaFreightEligibility: { ...DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS, ...seaEligibilitySchema.partial().parse(readLegacy('sea-freight-eligibility.json') ?? {}) },
    adjustTolerance: adjust.tolerance,
  })
}

async function main() {
  const args = process.argv.slice(2)
  if (args.some(arg => !['--apply', '--dry-run'].includes(arg)) || (args.includes('--apply') && args.includes('--dry-run'))) {
    throw new Error('Usage : migrate-shipping-costs.ts [--dry-run | --apply]')
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI doit etre fournie explicitement')
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 })
  try {
    await client.connect()
    const current = await client.db().collection(AppConfig.collection.name).findOne({ key: 'global' }, { projection: { shippingCosts: 1, marketPricing: 1 } })
    const pricing = current?.marketPricing === undefined ? legacyPricing() : undefined
    if (current?.marketPricing !== undefined) {
      const snapshot = sharedPricingSnapshotSchema.parse(current.marketPricing)
      console.log(`Tarifs commerciaux deja initialises, version ${snapshot.version}. Aucune modification.`)
    }
    if (current?.shippingCosts !== undefined) {
      const snapshot = shippingCostsSnapshotSchema.parse(current.shippingCosts)
      console.log(`Couts partages deja initialises, version ${snapshot.version}. Aucune modification.`)
    }
    const filePath = resolve(process.cwd(), 'data', 'shipping-costs.json')
    const costs = current?.shippingCosts === undefined ? getConfiguredInternalShippingCosts(filePath) : undefined
    if (costs) {
      console.log(`Source : ${existsSync(filePath) ? filePath : 'valeurs transporteur par defaut'}`)
      console.log(JSON.stringify(costs, null, 2))
    }
    if (pricing) {
      console.log(`Tarifs commerciaux : fichiers du dossier ${resolve(process.cwd(), 'data')} ou valeurs par defaut si absents.`)
      console.log(JSON.stringify(pricing, null, 2))
    }
    if (!args.includes('--apply')) {
      console.log('DRY-RUN : aucune ecriture MongoDB ni fichier. Relancer avec --apply pour initialiser.')
      return
    }
    if (costs) {
      const snapshot = await initializeSharedShippingCosts(costs)
      console.log(`Couts partages disponibles, version ${snapshot.version}. Fichier local conserve.`)
    }
    if (pricing) {
      const snapshot = await initializeSharedPricing(pricing)
      console.log(`Tarifs commerciaux disponibles, version ${snapshot.version}. Fichiers locaux conserves.`)
    }
  } finally {
    await client.close()
    await mongoose.disconnect()
  }
}

main().catch(error => {
  console.error('Migration des couts interrompue :', error instanceof Error ? error.message : error)
  process.exitCode = 1
})