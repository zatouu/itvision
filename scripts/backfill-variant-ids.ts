#!/usr/bin/env tsx
/**
 * Migration — ids de variantes produits (boutiques vendeur).
 *
 * Les variantes créées avant l'attribution automatique d'id n'ont pas de
 * champ `id` persisté : le devis (fail-closed) et l'inventaire ne peuvent pas
 * les résoudre → produit à variantes inachetable.
 *
 * Ce script assigne l'id déterministe `var_<indexGroupe>_<indexVariante>` —
 * identique au fallback exposé par `normalizeVariantGroups` (payload public),
 * donc aucune divergence d'id entre affichage et serveur.
 *
 * Additif et idempotent : les variantes avec un `id` sont conservées.
 *
 * Usage:
 *   npm run migrate:variant-ids:dry   # simulation
 *   npm run migrate:variant-ids       # applique
 */

import { connectDB } from '../src/lib/db'
import Product from '../src/lib/models/Product'

async function backfillVariantIds(dryRun = false) {
  console.log('Backfill des ids de variantes (variantGroups.*.variants.*.id)')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`)

  await connectDB()

  const products = await Product.find({
    'variantGroups.0': { $exists: true },
  }).select('_id name shopId variantGroups').lean() as any[]

  let scanned = 0
  let patched = 0
  let variantsPatched = 0

  for (const p of products) {
    scanned++
    let dirty = false
    const groups = (p.variantGroups || []).map((g: any, gIdx: number) => ({
      ...g,
      variants: (Array.isArray(g?.variants) ? g.variants : []).map((v: any, vIdx: number) => {
        if (v?.id) return v
        dirty = true
        variantsPatched++
        return { ...v, id: `var_${gIdx}_${vIdx}` }
      }),
    }))
    if (!dirty) continue

    patched++
    console.log(`  ${p.name} (${p._id}) — ${p.shopId ? 'boutique' : 'import'}`)
    if (!dryRun) {
      await Product.updateOne({ _id: p._id }, { $set: { variantGroups: groups } })
    }
  }

  console.log(`Produits scannés: ${scanned} — modifiés: ${patched} — variantes patchées: ${variantsPatched}`)
  if (dryRun) console.log('DRY RUN — aucune modification. Appliquer avec: npm run migrate:variant-ids')
}

const dry = process.argv.includes('--dry-run')
backfillVariantIds(dry)
  .then(() => process.exit(0))
  .catch((e) => { console.error('Migration échouée:', e); process.exit(1) })
