/**
 * Migration : installe l'arborescence de catégories de référence (familles →
 * sous-catégories) et reclasse les produits existants.
 * Idempotente. Équivalent du bouton admin « Réorganiser les catégories ».
 *
 * Usage :
 *   npx tsx scripts/migrate-product-categories.ts --dry-run
 *   npx tsx scripts/migrate-product-categories.ts
 */

import mongoose from 'mongoose'
import { connectDB } from '../src/lib/db'
import { reorganizeCategories } from '../src/lib/catalog/category-migration'

const isDryRun = process.argv.includes('--dry-run')

async function main() {
  await connectDB()
  const report = await reorganizeCategories({ dryRun: isDryRun })
  const tag = isDryRun ? ' (dry-run)' : ''

  console.log(`[migrate-product-categories] familles créées : ${report.families.created.length}, mises à jour : ${report.families.updated.length}${tag}`)
  console.log(`[migrate-product-categories] anciennes catégories désactivées : ${report.deactivated.join(', ') || 'aucune'}`)
  if (report.customCategories.length) {
    console.log(`[migrate-product-categories] catégories personnalisées conservées : ${report.customCategories.join(', ')}`)
  }
  console.log(`[migrate-product-categories] produits : ${report.products.changed}/${report.products.scanned} reclassés${tag}`)
  for (const c of report.products.changes) {
    console.log(`  ${c.from || '(vide)'} → ${c.to} | ${c.name.slice(0, 80)}`)
  }
  if (report.products.unresolved.length) {
    console.log('[migrate-product-categories] non classés :')
    for (const u of report.products.unresolved) console.log(`  ${u.category} (${u.count})`)
  }
}

main()
  .catch((error) => {
    console.error('[migrate-product-categories] erreur', error)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())