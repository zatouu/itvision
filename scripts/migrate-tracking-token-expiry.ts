import { connectDB } from '../src/lib/db'
import { Order } from '../src/lib/models/Order'

const TTL_DAYS = Number(process.env.ORDER_TRACKING_TOKEN_TTL_DAYS) || 90
const MS_PER_DAY = 24 * 60 * 60 * 1000

async function main() {
  await connectDB()

  const orders = await Order.find({
    trackingAccessTokenHash: { $exists: true, $ne: null },
    trackingAccessTokenExpiresAt: { $exists: false },
  }).lean()

  let updated = 0
  for (const doc of orders as any[]) {
    const createdAt = doc.trackingAccessTokenCreatedAt || doc.createdAt || new Date()
    const expiresAt = new Date(new Date(createdAt).getTime() + TTL_DAYS * MS_PER_DAY)
    await Order.updateOne({ _id: doc._id }, { $set: { trackingAccessTokenExpiresAt: expiresAt } })
    updated++
  }

  console.log(`[migrate-tracking-token-expiry] Migrated ${updated} orders`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
