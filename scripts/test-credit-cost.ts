/**
 * Script de test local pour le moteur de scoring des crédits.
 *
 * Usage : npx tsx scripts/test-credit-cost.ts
 */
import { computeUnlockCost } from '@/lib/credit-cost'
import { connectMongoose } from '@/lib/mongoose'

async function main() {
  await connectMongoose()

  const cases = [
    { category: 'plumbing', budget: 5_000, urgency: 'normal', media: [], distanceKm: 3, expected: 1 },
    { category: 'plumbing', budget: 25_000, urgency: 'normal', media: [], distanceKm: 3, expected: 2 },
    { category: 'electricity', budget: 80_000, urgency: 'normal', media: [], distanceKm: 3, expected: 3 },
    { category: 'it_support', budget: 250_000, urgency: 'normal', media: [], distanceKm: 3, expected: 5 },
    { category: 'plumbing', budget: 25_000, urgency: 'high', media: [], distanceKm: 3, expected: 3 },
    { category: 'plumbing', budget: 25_000, urgency: 'normal', media: [{ type: 'video' }], distanceKm: 3, expected: 3 },
    { category: 'plumbing', budget: 25_000, urgency: 'normal', media: [], distanceKm: 15, expected: 3 },
  ]

  let failed = 0
  for (const c of cases) {
    const res = await computeUnlockCost({
      requestId: 'test',
      category: c.category,
      budget: c.budget,
      urgency: c.urgency,
      media: c.media as any,
      distanceKm: c.distanceKm,
    })
    const ok = res.cost === c.expected
    if (!ok) failed++
    console.log(`${ok ? '✅' : '❌'} budget=${c.budget} cat=${c.category} urgency=${c.urgency} => cost=${res.cost} (expected ${c.expected})`, res.breakdown)
  }

  if (failed > 0) {
    console.error(`\n${failed} test(s) échoué(s)`)
    process.exit(1)
  }
  console.log('\nTous les tests de scoring sont passés.')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
