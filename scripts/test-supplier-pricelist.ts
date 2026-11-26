import assert from 'node:assert/strict'
import { ddmMinOrderQty, roundUpToLot } from '../src/lib/market/supplier-pricelists/min-order'
import { marketPricing, paidPerUnit, unitForPaid } from '../src/lib/market/supplier-pricelists/pricing-rules'

assert.equal(roundUpToLot(1), 1)
assert.equal(roundUpToLot(7), 8)
assert.equal(roundUpToLot(21), 25)

// Petit câble bon marché : la valeur de ligne domine (20 × 500 F = 10 000 F)
assert.deepEqual(ddmMinOrderQty({ unitPriceFcfa: 500, factoryMoq: 200, weightKg: 0.12 }).qty, 20)
// MOQ usine élevé : 10 acheteurs au plus pour remplir 400 pièces
const protector = ddmMinOrderQty({ unitPriceFcfa: 2_500, factoryMoq: 400, weightKg: 0.2 })
assert.equal(protector.qty, 40)
assert.equal(protector.driver, 'lot usine')
// Bobine 305 m (11 kg) : jamais à l'unité, maritime seulement
const reel = ddmMinOrderQty({ unitPriceFcfa: 19_000, factoryMoq: 30, weightKg: 11, volumeM3: 0.026 })
assert.equal(reel.qty, 3)
assert.equal(reel.seaOnly, true)
assert.ok(ddmMinOrderQty({ unitPriceFcfa: 19_000, factoryMoq: 10, weightKg: 11, volumeM3: 0.026 }).qty >= 2)
// Article cher à faible MOQ : à l'unité
assert.equal(ddmMinOrderQty({ unitPriceFcfa: 31_500, factoryMoq: 10, weightKg: 0.5 }).qty, 1)
// Plafond de ligne : le seuil « lot usine » ne dépasse pas 150 000 F
assert.equal(ddmMinOrderQty({ unitPriceFcfa: 12_000, factoryMoq: 400, weightKg: 0.6 }).qty, 12)
// Jamais au-delà du MOQ usine
assert.equal(ddmMinOrderQty({ unitPriceFcfa: 100, factoryMoq: 50, weightKg: 0.01 }).qty, 50)

// Prix calé sur Dakar : -20 % au lot minimum, -35 % au gros volume, marge plancher 15 %
const fees = { insuranceRate: 2.5 }
const near = (a: number, b: number, tol = 0.02) => assert.ok(Math.abs(a - b) / b <= tol, `${a} ≉ ${b}`)
near(paidPerUnit(unitForPaid(8_000, 10, fees, 500), 10, fees, 500), 8_000, 0.005)
const ref = { costFcfa: 4_000, marketFcfa: 10_000, shippingPerUnit: () => 500 }
// Plafond de marge à l’unité : un coût très bas ne dépasse jamais 110 % (prix encore plus bas que Dakar)
const cheap = marketPricing({ refs: [{ costFcfa: 1_000, marketFcfa: 10_000, shippingPerUnit: () => 500 }], minOrderQty: 10, maxFactoryMoq: 100, fees, fallbackMarginRate: 50 })
assert.equal(cheap.marginRate, 110)
assert.ok(paidPerUnit(1_000 * (1 + cheap.marginRate / 100), 10, fees, 500) < 8_000)
const p = marketPricing({ refs: [ref], minOrderQty: 10, maxFactoryMoq: 100, fees, fallbackMarginRate: 50 })
assert.equal(p.competitiveness, 'ok')
near(paidPerUnit(4_000 * (1 + p.marginRate / 100), 10, fees, 500), 8_000)
// Palier à 3 lots ; à 100 unités la remise quantité globale (−15 %) suffit à atteindre −35 % : pas de palier en plus
assert.deepEqual(p.tiers.map(t => t.minQty), [30])
assert.ok(p.tiers[0].marginRate < p.marginRate)
near(paidPerUnit(4_000 * (1 + p.tiers[0].marginRate / 100), 30, fees, 500), 7_200)
near(paidPerUnit(4_000 * (1 + p.tiers[0].marginRate / 100), 100, fees, 500), 6_400)
// Plusieurs relevés : le plus exigeant gagne
const two = marketPricing({ refs: [ref, { ...ref, marketFcfa: 6_000 }], minOrderQty: 10, maxFactoryMoq: 100, fees, fallbackMarginRate: 50 })
assert.ok(two.marginRate < p.marginRate)
// Coût trop élevé pour le marché : marge plancher, signalé
const dear = marketPricing({ refs: [{ costFcfa: 9_000, marketFcfa: 10_000, shippingPerUnit: () => 500 }], minOrderQty: 10, maxFactoryMoq: 100, fees, fallbackMarginRate: 50 })
assert.equal(dear.marginRate, 15)
assert.equal(dear.competitiveness, 'plus cher que Dakar')
assert.equal(dear.tiers.length, 0)
// Sans relevé : marge de repli, paliers proportionnels
const est = marketPricing({ refs: [], minOrderQty: 10, maxFactoryMoq: 100, fees, fallbackMarginRate: 60 })
assert.equal(est.source, 'estimé')
assert.equal(est.marginRate, 60)
assert.ok(est.tiers.every(t => t.marginRate >= 15 && t.marginRate < 60))

console.log('Lot minimum et prix fournisseurs : assertions OK')
