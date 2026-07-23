/**
 * Backfill ProviderProfile.performance (missions stats + rating) pour tous les providers.
 *
 * Usage :
 *   npx tsx scripts/backfill-provider-performance.ts
 *   npx tsx scripts/backfill-provider-performance.ts --dry-run
 */

import { connectDB } from '../src/lib/db'
import User from '../src/lib/models/User'
import ProviderProfile from '../src/lib/models/ProviderProfile'
import ServiceReview from '../src/lib/models/ServiceReview'
import { updateProviderProfilePerformance, recomputeProviderRating } from '../src/lib/provider-stats'

const isDryRun = process.argv.includes('--dry-run')

async function main() {
  await connectDB()

  const ids = new Set<string>()

  const [profiles, techs, reviewers] = await Promise.all([
    ProviderProfile.find().select('userId').lean() as any,
    User.find({ role: 'TECHNICIAN' }).select('_id').lean() as any,
    ServiceReview.distinct('providerId'),
  ])

  for (const p of profiles) ids.add(String(p.userId))
  for (const u of techs) ids.add(String(u._id))
  for (const id of reviewers) ids.add(String(id))

  const providerIds = Array.from(ids)
  console.log(`[backfill-provider-performance] Providers à traiter : ${providerIds.length}`)

  let processed = 0
  let errors = 0
  const batchSize = 50

  for (let i = 0; i < providerIds.length; i += batchSize) {
    const batch = providerIds.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (providerId) => {
        try {
          if (!isDryRun) {
            await updateProviderProfilePerformance(providerId)
            await recomputeProviderRating(providerId)
          }
          processed++
        } catch (e: any) {
          errors++
          console.error(`[backfill-provider-performance] ${providerId}`, e?.message || e)
        }
      })
    )
    if (!isDryRun && (i + batchSize) % batchSize === 0) {
      console.log(`[backfill-provider-performance] Traités ${Math.min(i + batchSize, providerIds.length)}/${providerIds.length}`)
    }
  }

  console.log(`[backfill-provider-performance] Terminé. Traités : ${processed}, erreurs : ${errors}`)
  if (isDryRun) {
    console.log('[backfill-provider-performance] Mode dry-run : aucune modification effectuée.')
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('[backfill-provider-performance] Erreur :', err)
  process.exit(1)
})
