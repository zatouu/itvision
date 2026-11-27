/* Verification chiffree de la refonte tarifaire — calcul pur, sans DB. */
import { marketPricing, paidPerUnit } from '../src/lib/market/supplier-pricelists/pricing-rules'

const fees = { insuranceRate: 2.5 }
const CNY = 85 // taux approximatif ¥ → FCFA

// Serrure AI reconnaissance faciale : cout usine ~300 ¥ transport inclus, marche Dakar 114 000 F
const ai = marketPricing({
  refs: [{ costFcfa: 300 * CNY, marketFcfa: 114_000, shippingPerUnit: () => 2_000 }],
  minOrderQty: 1,
  maxFactoryMoq: 50,
  fees,
  fallbackMarginRate: 40,
})
console.log('SERRURE AI (coute ~' + 300 * CNY + ' F, marche 114 000 F) :')
console.log('  marge catalogue:', ai.marginRate, '% → prix unitaire ~', Math.round(300 * CNY * (1 + ai.marginRate / 100)).toLocaleString('fr-FR'), 'F + frais')
console.log('  paliers:', ai.tiers.map((t) => t.minQty + 'pcs marge ' + t.marginRate + '%').join(' · ') || 'aucun')
const unit = Math.round(300 * CNY * (1 + ai.marginRate / 100))
console.log('  paye client a l unite:', Math.round(paidPerUnit(unit, 1, fees, 2000)).toLocaleString('fr-FR'), 'F (vs 114 000 F Dakar)')
console.log('  gain brut DDM/unite avant frais ops:', (unit - 300 * CNY).toLocaleString('fr-FR'), 'F')

// Interrupteur zigbee EU : cout ~50 ¥, marche ~15 000 F (comparable liwo)
const sw = marketPricing({
  refs: [{ costFcfa: 50 * CNY, marketFcfa: 15_000, shippingPerUnit: () => 1_700 }],
  minOrderQty: 5,
  maxFactoryMoq: 50,
  fees,
  fallbackMarginRate: 40,
})
console.log('INTERRUPTEUR ZIGBEE (coute ~' + 50 * CNY + ' F, marche 15 000 F) :')
console.log('  marge catalogue:', sw.marginRate, '% → prix unitaire ~', Math.round(50 * CNY * (1 + sw.marginRate / 100)).toLocaleString('fr-FR'), 'F')
console.log('  paliers:', sw.tiers.map((t) => t.minQty + 'pcs marge ' + t.marginRate + '%').join(' · ') || 'aucun')
const usw = Math.round(50 * CNY * (1 + sw.marginRate / 100))
console.log('  paye client a l unite:', Math.round(paidPerUnit(usw, 1, fees, 1700)).toLocaleString('fr-FR'), 'F (vs 15 000 F Dakar)')
console.log('  gain brut DDM/unite avant frais ops:', (usw - 50 * CNY).toLocaleString('fr-FR'), 'F')
