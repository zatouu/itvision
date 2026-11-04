/**
 * Tests unitaires du Visibility Engine ( PUR — aucune IO requise ).
 *
 * Exécution : npx tsx src/lib/visibility/__tests__/engine.test.ts
 *
 * Couvre :
 *  - VisibilityConfigService : defaults + merge
 *  - ProviderRankingService : pondération + boost + tri
 *  - VisibilityEngine : éligibilité, sélection par palier, conditions d'arrêt,
 *    plan complet de vagues, rayon = priorité (pas blocage)
 */

import assert from 'node:assert'
import { DEFAULT_VISIBILITY_CONFIG, mergeVisibilityConfig } from '../config'
import { scoreProvider, rankProviders, FACTORS } from '../ranking'
import { isEligible, filterAndRank, selectStageProviders, shouldStopBeforeStage, buildNotificationPlan } from '../engine'
import { normalizeMissionPreferences, preferenceRejection } from '../preferences'
import { ProviderCandidate, DispatchRequestContext } from '../types'

const config = DEFAULT_VISIBILITY_CONFIG

const req: DispatchRequestContext = {
  requestId: 'r1',
  clientId: 'c1',
  category: 'plomberie',
  location: { lat: 14.6928, lng: -17.4467 },
  budget: 25000,
  description: 'Fuite urgente',
  createdAt: new Date(),
}

function makeCandidate(over: Partial<ProviderCandidate> = {}): ProviderCandidate {
  return {
    providerId: 'p1',
    name: 'Test Provider',
    position: { lat: 14.7, lng: -17.45 },
    positionSource: 'gps',
    positionAgeSec: 60,
    distanceKm: 5,
    kycVerified: true,
    categories: ['plomberie'],
    secondaryCategories: [],
    availabilityStatus: 'Disponible',
    available: true,
    presenceStatus: 'available',
    currentLoad: 0,
    maxConcurrentMissions: 3,
    ratingAvg: 4.5,
    avgResponseSec: 60,
    tier: 'free',
    visibilityRadiusKm: 10,
    priorityLevel: 0,
    boostMultiplier: 1,
    ...over,
  }
}

// ─── ConfigService ───

console.log('▶ ConfigService tests')

{
  const cfg = mergeVisibilityConfig(null)
  assert.strictEqual(cfg.enabled, true)
  assert.strictEqual(cfg.defaultRadiusKm, 10)
  assert.strictEqual(cfg.escalation.length, 5)
  assert.strictEqual(cfg.escalation[0].radiusKm, 10)
  assert.strictEqual(cfg.escalation[4].radiusKm, 150)
  console.log('  ✔ defaults OK')
}

{
  const cfg = mergeVisibilityConfig({ defaultRadiusKm: 25, maxRadiusKm: 100 })
  assert.strictEqual(cfg.defaultRadiusKm, 25)
  assert.strictEqual(cfg.maxRadiusKm, 100)
  assert.strictEqual(cfg.escalation.length, 5) // garde les défauts
  console.log('  ✔ partial merge OK')
}

{
  const cfg = mergeVisibilityConfig({ escalation: [{ stage: 0, radiusKm: 5, delaySec: 0 }] })
  assert.strictEqual(cfg.escalation.length, 1)
  assert.strictEqual(cfg.escalation[0].radiusKm, 5)
  console.log('  ✔ escalation override OK')
}

// ─── RankingService ───

console.log('▶ RankingService tests')

{
  const c = makeCandidate()
  const { score, breakdown } = scoreProvider(c, req, config)
  assert.ok(score > 0, 'score should be positive')
  assert.ok(score <= 1, 'score with boost=1 should be <= 1')
  assert.ok(breakdown.distance > 0)
  assert.ok(breakdown.availability > 0)
  assert.ok(breakdown.category > 0)
  console.log(`  ✔ score=${score.toFixed(4)} breakdown OK`)
}

{
  // Provider plus proche doit avoir un meilleur score distance
  const near = makeCandidate({ providerId: 'near', distanceKm: 2 })
  const far = makeCandidate({ providerId: 'far', distanceKm: 50 })
  const nearScore = scoreProvider(near, req, config)
  const farScore = scoreProvider(far, req, config)
  assert.ok(nearScore.score > farScore.score, 'near should score higher than far')
  console.log(`  ✔ distance weighting: near=${nearScore.score.toFixed(4)} > far=${farScore.score.toFixed(4)}`)
}

{
  // Boost multiplier augmente le score
  const normal = makeCandidate({ providerId: 'n', boostMultiplier: 1 })
  const boosted = makeCandidate({ providerId: 'b', boostMultiplier: 2 })
  const ns = scoreProvider(normal, req, config)
  const bs = scoreProvider(boosted, req, config)
  assert.ok(bs.score > ns.score, 'boosted should score higher')
  console.log(`  ✔ boost: normal=${ns.score.toFixed(4)} < boosted=${bs.score.toFixed(4)}`)
}

{
  // Tri par score décroissant
  const candidates = [
    makeCandidate({ providerId: 'low', distanceKm: 80, ratingAvg: 2 }),
    makeCandidate({ providerId: 'high', distanceKm: 1, ratingAvg: 5 }),
    makeCandidate({ providerId: 'mid', distanceKm: 20, ratingAvg: 3.5 }),
  ]
  const ranked = rankProviders(candidates, req, config)
  assert.strictEqual(ranked[0].providerId, 'high')
  assert.strictEqual(ranked[1].providerId, 'mid')
  assert.strictEqual(ranked[2].providerId, 'low')
  console.log('  ✔ ranking sort: high > mid > low')
}

// ─── VisibilityEngine ───

console.log('▶ VisibilityEngine tests')

{
  // Éligibilité
  assert.ok(isEligible(makeCandidate(), req), 'eligible candidate')
  assert.ok(isEligible(makeCandidate({ kycVerified: false }), req), 'KYC not verified → still eligible by default')
  assert.ok(!isEligible(makeCandidate({ kycVerified: false }), req, { ...config, requireKycForNotification: true }), 'KYC enforced when config requires it')
  assert.ok(!isEligible(makeCandidate({ categories: ['electricite'] }), req), 'wrong category → ineligible')
  assert.ok(!isEligible(makeCandidate({ distanceKm: null }), req), 'no position → ineligible')
  assert.ok(!isEligible(makeCandidate({ currentLoad: 3, maxConcurrentMissions: 3 }), req), 'overloaded → ineligible')
  // Catégories vides = généraliste → eligible
  assert.ok(isEligible(makeCandidate({ categories: [] }), req), 'generalist (empty cats) → eligible')
  console.log('  ✔ eligibility gate OK')
}

{
  // Sélection par palier : stage 0 (10km) ne doit pas inclure un provider à 15km
  const { ranked } = filterAndRank([
    makeCandidate({ providerId: 'close', distanceKm: 5 }),
    makeCandidate({ providerId: 'far', distanceKm: 15 }),
  ], req, config)
  const already = new Set<string>()
  const s0 = selectStageProviders(config, 0, ranked, already)
  assert.ok(s0.providerIds.includes('close'), 'close provider in stage 0')
  assert.ok(!s0.providerIds.includes('far'), 'far provider NOT in stage 0 (10km)')
  console.log('  ✔ stage 0 radius filtering: close in, far out')
}

{
  // Stage 1 (20km) inclut le provider à 15km, pas déjà notifié
  const { ranked } = filterAndRank([
    makeCandidate({ providerId: 'close', distanceKm: 5 }),
    makeCandidate({ providerId: 'mid', distanceKm: 15 }),
  ], req, config)
  const already = new Set<string>(['close'])
  const s1 = selectStageProviders(config, 1, ranked, already)
  assert.ok(s1.providerIds.includes('mid'), 'mid provider in stage 1')
  assert.ok(!s1.providerIds.includes('close'), 'close already notified → excluded')
  console.log('  ✔ stage 1: mid included, close excluded (dedup)')
}

{
  // Condition d'arrêt : au stage 0, 0 offre et 0 notifié → ne pas stopper
  assert.ok(!shouldStopBeforeStage(config, 0, 0, 0), 'stage 0 with 0 offers/0 notified → do NOT stop')
  // 1 offre reçue → stopper avant stage 1
  assert.ok(shouldStopBeforeStage(config, 1, 1, 3), 'stage 1 with 1 offer → stop')
  // 0 offre mais 10 notifiés (>= minProvidersToStop=8) → stopper
  assert.ok(shouldStopBeforeStage(config, 1, 0, 10), 'stage 1 with 10 notified → stop')
  console.log('  ✔ stop conditions OK')
}

{
  // Plan complet : rayon = priorité, pas blocage. Un provider à 15km finit par
  // être notifié au stage 1 même s'il n'est pas dans le stage 0.
  const plan = buildNotificationPlan([
    makeCandidate({ providerId: 'close', distanceKm: 5 }),
    makeCandidate({ providerId: 'mid', distanceKm: 15 }),
    makeCandidate({ providerId: 'far', distanceKm: 45 }),
    makeCandidate({ providerId: 'noPos', distanceKm: null }),
  ], req, config)

  assert.strictEqual(plan.totalEligible, 3, '3 eligible (noPos excluded)')
  assert.strictEqual(plan.waves.length, 5, '5 stages')
  assert.ok(plan.waves[0].providerIds.includes('close'), 'wave 0: close')
  assert.ok(!plan.waves[0].providerIds.includes('mid'), 'wave 0: mid NOT (15km > 10km)')
  assert.ok(plan.waves[1].providerIds.includes('mid'), 'wave 1: mid (15km <= 20km)')
  assert.ok(plan.waves[3].providerIds.includes('far'), 'wave 3: far (45km <= 60km)')
  console.log('  ✔ full plan: progressive escalation, radius=priority not block')
}

{
  // Provider illimité (radiusKm=-1) doit quand même être filtré par distance
  // pour le scoring, mais le tier n'élargit pas artificiellement le rayon du palier.
  const plan = buildNotificationPlan([
    makeCandidate({ providerId: 'unlimited', distanceKm: 5, tier: 'unlimited', visibilityRadiusKm: -1, boostMultiplier: 2 }),
    makeCandidate({ providerId: 'free', distanceKm: 5, tier: 'free', boostMultiplier: 1 }),
  ], req, config)
  // Les deux sont dans le stage 0 (5km <= 10km), mais unlimited a un meilleur score (boost 2x)
  assert.ok(plan.waves[0].providerIds.includes('unlimited'))
  assert.ok(plan.waves[0].providerIds.includes('free'))
  console.log('  ✔ unlimited tier: included in wave, boost applied via score')
}

// ─── Préférences missions du profil ───

console.log('▶ Préférences missions tests')

{
  assert.deepStrictEqual(normalizeMissionPreferences(undefined), { maxDistanceKm: null, minAmount: null, acceptUrgent: true, acceptPlanned: true })
  assert.deepStrictEqual(normalizeMissionPreferences({ maxDistanceKm: '15', minAmount: 0, urgent: false }), { maxDistanceKm: 15, minAmount: null, acceptUrgent: false, acceptPlanned: true })
  assert.strictEqual(normalizeMissionPreferences({ maxDistanceKm: 100 }).maxDistanceKm, null, '100 km = sans limite')
  console.log('  ✔ normalisation (absent = aucun filtre)')
}

{
  const prefs = normalizeMissionPreferences({ maxDistanceKm: 8, minAmount: 30000, urgent: false, planned: false })
  assert.strictEqual(preferenceRejection(prefs, { distanceKm: 9 }), 'max_distance')
  assert.strictEqual(preferenceRejection(prefs, { distanceKm: 5, budget: 20000 }), 'min_amount')
  assert.strictEqual(preferenceRejection(prefs, { distanceKm: 5, budget: null }), null, 'budget inconnu jamais exclu')
  assert.strictEqual(preferenceRejection(prefs, { distanceKm: 5, urgent: true }), 'urgent_off')
  assert.strictEqual(preferenceRejection(prefs, { distanceKm: 5, scheduled: true }), 'planned_off')
  assert.strictEqual(preferenceRejection(prefs, { distanceKm: 5, budget: 40000 }), null)
  console.log('  ✔ règles distance / montant / urgentes / planifiées')
}

{
  const picky = makeCandidate({ providerId: 'picky', preferences: normalizeMissionPreferences({ minAmount: 50000 }) })
  const open = makeCandidate({ providerId: 'open' })
  assert.strictEqual(isEligible(picky, req, config), false, 'budget 25000 < min 50000')
  assert.strictEqual(isEligible(open, req, config), true)
  const { ranked, reasons } = filterAndRank([picky, open], req, config)
  assert.deepStrictEqual(ranked.map(r => r.providerId), ['open'])
  assert.strictEqual(reasons.picky, 'preferences:min_amount')
  const near = makeCandidate({ providerId: 'near', distanceKm: 3, preferences: normalizeMissionPreferences({ maxDistanceKm: 4 }) })
  const tooFar = makeCandidate({ providerId: 'tooFar', distanceKm: 6, preferences: normalizeMissionPreferences({ maxDistanceKm: 4 }) })
  assert.deepStrictEqual(filterAndRank([near, tooFar], req, config).ranked.map(r => r.providerId), ['near'])
  const noUrgent = makeCandidate({ providerId: 'noUrgent', preferences: normalizeMissionPreferences({ urgent: false }) })
  assert.strictEqual(isEligible(noUrgent, { ...req, urgent: true }, config), false)
  assert.strictEqual(isEligible(noUrgent, req, config), true)
  console.log('  ✔ diffusion : préférences appliquées par le moteur')
}

{
  // Un client qui est aussi prestataire ne reçoit pas sa propre demande
  const self = makeCandidate({ providerId: req.clientId })
  assert.strictEqual(isEligible(self, req, config), false)
  assert.strictEqual(filterAndRank([self], req, config).reasons[req.clientId], 'own_request')
  console.log('  ✔ le client n\'est jamais notifié de sa propre demande')
}

console.log('\n✅ Tous les tests du Visibility Engine passent.')
