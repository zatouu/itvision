/**
 * Import d'une grille fournisseur direct (même logique que le bouton /admin/fournisseurs).
 *
 *   npx tsx scripts/import-supplier-pricelist.ts zhilian --dry-run
 *   npx tsx scripts/import-supplier-pricelist.ts zhilian --apply [--publish] [--only=cle1,cle2]
 * Sans --only, --apply importe les familles cochées par défaut (cf. PricelistRow.recommended).
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { SUPPLIER_PRICELISTS } from '@/lib/market/supplier-pricelists'
import { applyPricelist, previewPricelist } from '@/lib/market/supplier-pricelists/import'

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} F`

async function main() {
  const id = process.argv[2]
  const list = SUPPLIER_PRICELISTS[id]
  if (!list) throw new Error(`Grille inconnue « ${id} » (disponibles : ${Object.keys(SUPPLIER_PRICELISTS).join(', ')})`)
  const apply = process.argv.includes('--apply')
  const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',').filter(Boolean)
  const preview = await previewPricelist(list)
  const plan = apply
    ? await applyPricelist(list, { publish: process.argv.includes('--publish'), keys: only ?? preview.rows.filter(r => r.recommended).map(r => r.key) })
    : preview

  console.log(`Marge des familles sans relevé : ${plan.rules.fallbackMarginRate} %\n`)
  for (const r of plan.rows) {
    const mark = { new: '+', update: '~', unchanged: '=', skipped: '-' }[r.status]
    const tiers = r.pricing.tiers.map(t => `${t.minQty}+ ${fcfa(t.paidFcfa)}`).join(' · ')
    console.log(`${mark} ${r.key.padEnd(30)} marge ${String(r.pricing.marginRate).padStart(5)} % (${r.pricing.source}) · lot ${String(r.minOrder.qty).padStart(3)} → payé ${fcfa(r.atMin.paidFcfa)}/u (${r.atMin.shippingMode} ${fcfa(r.atMin.shippingFcfa)}, gain ${fcfa(r.atMin.gainFcfa)})${tiers ? ` · paliers ${tiers}` : ''}${r.pricing.competitiveness !== 'ok' ? ` · ⚠ ${r.pricing.competitiveness}` : ''}`)
    for (const m of r.market) console.log(`    ${m.variant} : Dakar ${fcfa(m.marketFcfa)} · DDM ${fcfa(m.paidAtMinFcfa)} (${m.gapAtMinPercent} %) → gros volume ${fcfa(m.paidAtBulkFcfa)} (${m.gapAtBulkPercent} %)`)
  }
  const t = plan.totals
  console.log(`\n${apply ? '' : '[aperçu] '}${t.families} familles — ${t.new} nouvelles, ${t.update} mises à jour, ${t.unchanged} inchangées, ${t.skipped} écartées · ${t.notRecommended} non cochées par défaut`)
}

main()
  .catch(err => { console.error(err); process.exitCode = 1 })
  .finally(() => mongoose.disconnect())
