import { z } from 'zod'
import { connectMongoose } from '@/lib/mongoose'
import AppConfig from '@/lib/models/AppConfig'
import { REAL_SHIPPING_COSTS, type ShippingCosts, type ShippingMethodId } from '@/lib/logistics'
import { internalShippingCostsSchema } from './settings'

const methods = Object.keys(REAL_SHIPPING_COSTS) as ShippingMethodId[]
const completeCostsSchema = internalShippingCostsSchema
  .refine(costs => methods.every(method => costs[method] !== undefined), 'Tous les modes de transport sont requis')
  .transform(costs => costs as ShippingCosts)

export const shippingCostsSnapshotSchema = z.object({
  version: z.number().int().positive(),
  costs: completeCostsSchema,
  updatedAt: z.coerce.date(),
}).strict()

export type ShippingCostsSnapshot = z.infer<typeof shippingCostsSnapshotSchema>

export class ShippingCostsConflictError extends Error {
  constructor() { super('Les couts ont ete modifies ailleurs. Rechargez les tarifs avant de sauvegarder.') }
}

export async function readSharedShippingCosts(): Promise<ShippingCostsSnapshot> {
  await connectMongoose()
  const config = await AppConfig.findOne({ key: 'global' }).select('shippingCosts').read('primary').lean()
  if (!config?.shippingCosts) throw new Error('Couts transporteur partages non initialises : executer la migration depuis le serveur admin.')
  return shippingCostsSnapshotSchema.parse(config.shippingCosts)
}

export async function initializeSharedShippingCosts(costs: ShippingCosts): Promise<ShippingCostsSnapshot> {
  const validated = completeCostsSchema.parse(costs)
  await connectMongoose()
  await AppConfig.init()
  try {
    await AppConfig.updateOne({ key: 'global' }, { $setOnInsert: { key: 'global' } }, { upsert: true })
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error
  }
  await AppConfig.updateOne(
    { key: 'global', shippingCosts: { $exists: false } },
    { $set: { shippingCosts: { version: 1, costs: validated, updatedAt: new Date() } } },
    { runValidators: true }
  )
  return readSharedShippingCosts()
}

export async function writeSharedShippingCosts(payload: unknown, expectedVersion: number): Promise<ShippingCostsSnapshot> {
  const validated = internalShippingCostsSchema.parse(payload)
  z.number().int().positive().parse(expectedVersion)
  const current = await readSharedShippingCosts()
  if (current.version !== expectedVersion) throw new ShippingCostsConflictError()
  const costs = Object.fromEntries(methods.map(method => [method, { ...current.costs[method], ...validated[method] }])) as ShippingCosts
  const updated = await AppConfig.findOneAndUpdate(
    { key: 'global', 'shippingCosts.version': expectedVersion },
    { $set: { 'shippingCosts.costs': costs, 'shippingCosts.updatedAt': new Date() }, $inc: { 'shippingCosts.version': 1 } },
    { new: true, runValidators: true }
  ).select('shippingCosts').lean()
  if (!updated) throw new ShippingCostsConflictError()
  return shippingCostsSnapshotSchema.parse(updated.shippingCosts)
}