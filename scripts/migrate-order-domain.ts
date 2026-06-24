/**
 * Migration : backfill Order.domain pour les commandes existantes.
 * Historiquement, toutes les commandes étaient marketplace.
 * Cette migration définit domain='marketplace' sur les commandes sans domain.
 *
 * Usage :
 *   npx tsx scripts/migrate-order-domain.ts
 *   npx tsx scripts/migrate-order-domain.ts --dry-run
 */

import { connectDB } from '../src/lib/db'
import { Order } from '../src/lib/models/Order'

const isDryRun = process.argv.includes('--dry-run')

async function main() {
  await connectDB()

  const query = {
    $or: [{ domain: { $exists: false } }, { domain: null }]
  }

  const count = await Order.countDocuments(query)
  console.log(`[migrate-order-domain] Commandes à mettre à jour : ${count}`)

  if (count === 0) {
    console.log('[migrate-order-domain] Rien à faire.')
    process.exit(0)
  }

  if (isDryRun) {
    console.log('[migrate-order-domain] Mode dry-run : aucune modification effectuée.')
    process.exit(0)
  }

  const result = await Order.updateMany(query, { $set: { domain: 'marketplace' } })
  console.log(`[migrate-order-domain] Mis à jour : ${result.modifiedCount} / ${result.matchedCount}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[migrate-order-domain] Erreur :', err)
  process.exit(1)
})
