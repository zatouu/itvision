import { MongoClient } from 'mongodb'
import Redis from 'ioredis'
import AppConfig from '../src/lib/models/AppConfig'
import { sharedPricingSnapshotSchema } from '../src/lib/pricing/shared-settings'
import { shippingCostsSnapshotSchema } from '../src/lib/shipping/shared-costs'

async function main() {
  const mongoUri = process.env.MONGODB_URI
  const redisUrl = process.env.REDIS_URL
  if (!mongoUri || !redisUrl) throw new Error('MONGODB_URI et REDIS_URL sont obligatoires')
  if (!process.env.JWT_SECRET || !process.env.NEXTAUTH_SECRET || !process.env.CRON_SECRET) {
    throw new Error('Les secrets JWT, NextAuth et cron doivent etre configures')
  }
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000, readPreference: 'primary' })
  const redis = new Redis(redisUrl, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 0, connectTimeout: 5000, retryStrategy: () => null })
  redis.on('error', () => {})
  try {
    await client.connect()
    const topology = await client.db().command({ hello: 1 })
    if (!topology.setName || !topology.isWritablePrimary) throw new Error('MongoDB doit disposer d\'un primaire en replica set')
    const config = await client.db().collection(AppConfig.collection.name).findOne({ key: 'global' }, { projection: { marketPricing: 1, shippingCosts: 1 } })
    const pricing = sharedPricingSnapshotSchema.safeParse(config?.marketPricing)
    const costs = shippingCostsSnapshotSchema.safeParse(config?.shippingCosts)
    if (!pricing.success || !costs.success) throw new Error('Tarifs absents ou invalides : verifier la migration market-pricing avant la bascule')
    await redis.connect()
    if (await redis.ping() !== 'PONG') throw new Error('Redis indisponible')
    console.log(`Precontrole OK : Mongo primaire, Redis, pricingVersion=${pricing.data.version}, internalCostsVersion=${costs.data.version}. Aucune ecriture.`)
  } finally {
    redis.disconnect()
    await client.close()
  }
}

main().catch(error => {
  console.error('Precontrole refuse :', error instanceof Error && !/mongodb|redis:\/\//i.test(error.message) ? error.message : 'connexion indisponible (details masques)')
  process.exitCode = 1
})