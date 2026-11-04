import { z } from 'zod'
import { connectMongoose } from '@/lib/mongoose'
import AppConfig from '@/lib/models/AppConfig'
import { pricingDefaultsUpdateSchema } from '@/lib/validation'
import { BASE_SHIPPING_RATES, type ShippingMethodId, type ShippingRate } from '@/lib/logistics'
import type { PricingDefaults } from './settings'
import { SOURCE_CURRENCIES } from './constants'
import { internalShippingCostsSchema } from '@/lib/shipping/settings'
import { readSharedShippingCosts, shippingCostsSnapshotSchema, ShippingCostsConflictError } from '@/lib/shipping/shared-costs'

const defaultsSchema = pricingDefaultsUpdateSchema.refine(value => [
  'defaultExchangeRate', 'defaultServiceFeeRate', 'singleImportServiceFeeRate',
  'defaultInsuranceRate', 'defaultB2BDiscountPercent', 'serviceFeeTiers',
].every(key => Object.hasOwn(value, key)), 'Tous les reglages de prix sont requis').transform(value => {
  const defaults = value as PricingDefaults
  return {
    ...defaults,
    defaultExchangeRate: Math.round(defaults.defaultExchangeRate),
    serviceFeeTiers: defaults.serviceFeeTiers.map((tier, index, tiers) => {
      const normalized = { ...tier }
      if (tiers[index + 1]) normalized.maxAmount = tiers[index + 1].minAmount
      else delete normalized.maxAmount
      return normalized
    }),
  }
})

const rateSchema = z.object({
  rate: z.number().finite().int().min(0).max(1_000_000_000),
  minimumCharge: z.number().finite().int().min(0).max(1_000_000_000).optional(),
}).strict()

export const shippingRatesSchema = z.object({
  air_express: rateSchema, air_15: rateSchema, sea_freight: rateSchema, local_24h: rateSchema,
}).strict()

export const seaEligibilitySchema = z.object({
  minVolumeM3: z.number().finite().min(0).max(100),
  minBilledWeightKg: z.number().finite().min(0).max(100000),
  minOrderValueFcfa: z.number().finite().int().min(0).max(10_000_000_000),
  requireDimensionsOrVolume: z.boolean(),
}).strict()

export const sharedPricingConfigSchema = z.object({
  defaults: defaultsSchema,
  sourceCurrencyRates: z.record(z.enum(SOURCE_CURRENCIES), z.number().finite().positive()),
  shippingRates: shippingRatesSchema,
  seaFreightEligibility: seaEligibilitySchema,
  adjustTolerance: z.number().finite().min(0).max(0.5),
}).strict().transform(config => ({ ...config, sourceCurrencyRates: { ...config.sourceCurrencyRates, CNY: config.defaults.defaultExchangeRate } }))

export const sharedPricingUpdateSchema = z.object({
  defaults: pricingDefaultsUpdateSchema.optional(),
  sourceCurrencyRates: z.partialRecord(z.enum(SOURCE_CURRENCIES), z.number().finite().positive()).optional(),
  shippingRates: shippingRatesSchema.partial().optional(),
  seaFreightEligibility: seaEligibilitySchema.partial().optional(),
  adjustTolerance: z.number().finite().min(0).max(0.5).optional(),
}).strict().refine(value => Object.values(value).some(item => item !== undefined), 'Aucun reglage fourni')

export const sharedPricingSnapshotSchema = z.object({
  version: z.number().int().positive(),
  updatedAt: z.coerce.date(),
  config: sharedPricingConfigSchema,
}).strict()

export type SharedPricingConfig = z.infer<typeof sharedPricingConfigSchema>
export type SharedPricingSnapshot = z.infer<typeof sharedPricingSnapshotSchema>

export class PricingConflictError extends Error {
  constructor() { super('Les tarifs ont ete modifies ailleurs. Rechargez les reglages.') }
}

export function configuredShippingRates(config: SharedPricingConfig): Record<ShippingMethodId, ShippingRate> {
  return Object.fromEntries((Object.keys(BASE_SHIPPING_RATES) as ShippingMethodId[]).map(method => [
    method, { ...BASE_SHIPPING_RATES[method], ...config.shippingRates[method] },
  ])) as Record<ShippingMethodId, ShippingRate>
}

export async function readSharedPricing(): Promise<SharedPricingSnapshot> {
  await connectMongoose()
  const document = await AppConfig.findOne({ key: 'global' }).select('marketPricing').read('primary').lean()
  if (!document?.marketPricing) throw new Error('Tarifs partages non initialises : executer la migration depuis le serveur de reference.')
  return sharedPricingSnapshotSchema.parse(document.marketPricing)
}

export async function readSharedTariffs() {
  await connectMongoose()
  const document = await AppConfig.findOne({ key: 'global' }).select('marketPricing shippingCosts').read('primary').lean()
  return { pricing: sharedPricingSnapshotSchema.parse(document?.marketPricing), costs: shippingCostsSnapshotSchema.parse(document?.shippingCosts) }
}

export async function initializeSharedPricing(config: unknown): Promise<SharedPricingSnapshot> {
  const validated = sharedPricingConfigSchema.parse(config)
  await connectMongoose()
  await AppConfig.init()
  try {
    await AppConfig.updateOne({ key: 'global' }, { $setOnInsert: { key: 'global' } }, { upsert: true })
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error
  }
  await AppConfig.updateOne({ key: 'global', marketPricing: { $exists: false } }, {
    $set: { marketPricing: { version: 1, updatedAt: new Date(), config: validated } },
  }, { runValidators: true })
  return readSharedPricing()
}

export async function writeSharedPricing(payload: unknown, expectedVersion: number, internalCosts?: { payload: unknown; expectedVersion: number }): Promise<SharedPricingSnapshot> {
  const patch = sharedPricingUpdateSchema.parse(payload)
  z.number().int().positive().parse(expectedVersion)
  const current = await readSharedPricing()
  if (current.version !== expectedVersion) throw new PricingConflictError()
  const filter: Record<string, unknown> = { key: 'global', 'marketPricing.version': expectedVersion }
  const set: Record<string, unknown> = {}
  const increment: Record<string, number> = { 'marketPricing.version': 1 }
  if (internalCosts) {
    const validated = internalShippingCostsSchema.parse(internalCosts.payload)
    z.number().int().positive().parse(internalCosts.expectedVersion)
    const costs = await readSharedShippingCosts()
    if (costs.version !== internalCosts.expectedVersion) throw new ShippingCostsConflictError()
    filter['shippingCosts.version'] = internalCosts.expectedVersion
    set['shippingCosts.costs'] = Object.fromEntries((Object.keys(BASE_SHIPPING_RATES) as ShippingMethodId[]).map(method => [method, { ...costs.costs[method], ...validated[method] }]))
    set['shippingCosts.updatedAt'] = new Date()
    increment['shippingCosts.version'] = 1
  }
  const config = sharedPricingConfigSchema.parse({
    ...current.config,
    ...patch,
    adjustTolerance: patch.adjustTolerance ?? current.config.adjustTolerance,
    defaults: { ...current.config.defaults, ...patch.defaults },
    sourceCurrencyRates: { ...current.config.sourceCurrencyRates, ...patch.sourceCurrencyRates },
    shippingRates: Object.fromEntries((Object.keys(BASE_SHIPPING_RATES) as ShippingMethodId[]).map(method => [
      method, { ...current.config.shippingRates[method], ...patch.shippingRates?.[method] },
    ])),
    seaFreightEligibility: { ...current.config.seaFreightEligibility, ...patch.seaFreightEligibility },
  })
  const document = await AppConfig.findOneAndUpdate(
    filter,
    { $set: { ...set, 'marketPricing.config': config, 'marketPricing.updatedAt': new Date() }, $inc: increment },
    { new: true, runValidators: true }
  ).select('marketPricing').lean()
  if (!document) throw new PricingConflictError()
  return sharedPricingSnapshotSchema.parse(document.marketPricing)
}