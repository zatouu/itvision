#!/usr/bin/env tsx
/**
 * Script de migration - Marge Commerciale
 * 
 * Migration de la valeur par défaut de marginRate de 25% à 0%
 * 
 * Usage:
 *   npm run migrate:margin
 *   # ou directement:
 *   tsx scripts/migrate-margin-rate.ts
 * 
 * Options:
 *   --dry-run : Affiche les changements sans les appliquer
 *   --reset-all : Réinitialise TOUS les produits à 0% (dangereux!)
 *   --keep-custom : Ne modifie que les produits avec marge = 25% (recommandé)
 */

import { connectDB } from '../src/lib/db/mongodb'
import Product from '../src/lib/models/Product'

interface MigrationStats {
  totalProducts: number
  productsWithMargin25: number
  productsWithoutMargin: number
  productsWithCustomMargin: number
  modified: number
  errors: number
}

async function migrateMarginRates(options: {
  dryRun?: boolean
  resetAll?: boolean
  keepCustom?: boolean
} = {}) {
  const { dryRun = false, resetAll = false, keepCustom = true } = options

  console.log('🔧 Migration des marges commerciales')
  console.log('━'.repeat(60))
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (simulation)' : '✅ PRODUCTION'}`)
  console.log(`Stratégie: ${
    resetAll 
      ? '⚠️  RESET ALL (tous les produits à 0%)'
      : keepCustom
      ? '✅ KEEP CUSTOM (uniquement marge 25% → 0%)'
      : '🔄 STANDARD'
  }`)
  console.log('━'.repeat(60))
  console.log()

  await connectDB()

  const stats: MigrationStats = {
    totalProducts: 0,
    productsWithMargin25: 0,
    productsWithoutMargin: 0,
    productsWithCustomMargin: 0,
    modified: 0,
    errors: 0
  }

  try {
    // 1. Comptage des produits
    stats.totalProducts = await Product.countDocuments()
    console.log(`📦 Total produits: ${stats.totalProducts}`)
    
    stats.productsWithMargin25 = await Product.countDocuments({ marginRate: 25 })
    console.log(`   - Produits avec marge = 25%: ${stats.productsWithMargin25}`)
    
    stats.productsWithoutMargin = await Product.countDocuments({ 
      $or: [
        { marginRate: { $exists: false } },
        { marginRate: null }
      ]
    })
    console.log(`   - Produits sans marge définie: ${stats.productsWithoutMargin}`)
    
    stats.productsWithCustomMargin = await Product.countDocuments({
      marginRate: { $exists: true, $ne: null, $ne: 25 }
    })
    console.log(`   - Produits avec marge personnalisée: ${stats.productsWithCustomMargin}`)
    console.log()

    // 2. Détails des produits concernés
    if (stats.productsWithMargin25 > 0) {
      console.log('📋 Exemples de produits avec marge = 25%:')
      const examples = await Product.find({ marginRate: 25 })
        .select('name price baseCost marginRate')
        .limit(5)
        .lean()
      
      examples.forEach((p, i) => {
        const cost = p.baseCost || 0
        const price = p.price || 0
        const margin = cost > 0 ? ((price - cost) / cost * 100).toFixed(1) : 'N/A'
        console.log(`   ${i + 1}. ${p.name}`)
        console.log(`      Coût: ${cost} FCFA | Prix: ${price} FCFA | Marge réelle: ${margin}%`)
      })
      console.log()
    }

    // 3. Migration
    if (!dryRun) {
      console.log('🔄 Début de la migration...')
      console.log()

      if (resetAll) {
        // Option dangereuse: réinitialiser TOUS les produits
        console.log('⚠️  ATTENTION: Réinitialisation de TOUS les produits à 0%')
        const result = await Product.updateMany(
          {},
          { $set: { marginRate: 0 } }
        )
        stats.modified = result.modifiedCount
        console.log(`✅ ${stats.modified} produits mis à jour`)
        
      } else if (keepCustom) {
        // Option recommandée: uniquement les produits avec marge 25%
        console.log('🎯 Migration des produits avec marge = 25% uniquement')
        
        // Mise à jour des produits avec marginRate = 25
        const result1 = await Product.updateMany(
          { marginRate: 25 },
          { $set: { marginRate: 0 } }
        )
        stats.modified += result1.modifiedCount
        console.log(`   - ${result1.modifiedCount} produits (marge 25% → 0%)`)
        
        // Mise à jour des produits sans marginRate
        const result2 = await Product.updateMany(
          { 
            $or: [
              { marginRate: { $exists: false } },
              { marginRate: null }
            ]
          },
          { $set: { marginRate: 0 } }
        )
        stats.modified += result2.modifiedCount
        console.log(`   - ${result2.modifiedCount} produits (undefined → 0%)`)
        console.log()
        console.log(`✅ Total: ${stats.modified} produits mis à jour`)
        
      } else {
        // Option standard
        const result = await Product.updateMany(
          { 
            $or: [
              { marginRate: 25 },
              { marginRate: { $exists: false } },
              { marginRate: null }
            ]
          },
          { $set: { marginRate: 0 } }
        )
        stats.modified = result.modifiedCount
        console.log(`✅ ${stats.modified} produits mis à jour`)
      }
    } else {
      // Mode DRY RUN
      console.log('🔍 DRY RUN - Aucune modification appliquée')
      console.log()
      console.log('Changements qui seraient appliqués:')
      if (resetAll) {
        console.log(`   - ${stats.totalProducts} produits → marginRate = 0%`)
      } else if (keepCustom) {
        console.log(`   - ${stats.productsWithMargin25} produits (marge 25%) → 0%`)
        console.log(`   - ${stats.productsWithoutMargin} produits (sans marge) → 0%`)
        console.log(`   - ${stats.productsWithCustomMargin} produits avec marge custom → INCHANGÉS`)
      }
    }

    // 4. Vérification post-migration
    if (!dryRun && stats.modified > 0) {
      console.log()
      console.log('🔍 Vérification post-migration...')
      
      const remainingMargin25 = await Product.countDocuments({ marginRate: 25 })
      const productsWithMargin0 = await Product.countDocuments({ marginRate: 0 })
      
      console.log(`   - Produits avec marge = 0%: ${productsWithMargin0}`)
      console.log(`   - Produits avec marge = 25% (restants): ${remainingMargin25}`)
      
      if (remainingMargin25 > 0 && keepCustom) {
        console.log('   ⚠️  Des produits avec marge 25% subsistent (vérifier manuellement)')
      }
    }

    // 5. Résumé final
    console.log()
    console.log('━'.repeat(60))
    console.log('📊 RÉSUMÉ')
    console.log('━'.repeat(60))
    console.log(`Total produits: ${stats.totalProducts}`)
    console.log(`Produits modifiés: ${stats.modified}`)
    console.log(`Erreurs: ${stats.errors}`)
    console.log()
    
    if (dryRun) {
      console.log('💡 Pour appliquer ces changements:')
      console.log('   npm run migrate:margin')
      console.log('   # ou')
      console.log('   tsx scripts/migrate-margin-rate.ts')
    } else {
      console.log('✅ Migration terminée avec succès!')
      console.log()
      console.log('📝 Prochaines étapes:')
      console.log('   1. Vérifier les produits dans l\'interface admin')
      console.log('   2. Ajuster manuellement les marges si nécessaire')
      console.log('   3. Documenter les changements dans CHANGELOG.md')
    }

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    stats.errors++
    throw error
  }

  return stats
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2)
  const options = {
    dryRun: args.includes('--dry-run'),
    resetAll: args.includes('--reset-all'),
    keepCustom: !args.includes('--reset-all') && !args.includes('--no-keep-custom')
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: tsx scripts/migrate-margin-rate.ts [options]

Options:
  --dry-run          Simulation sans modification (recommandé d'abord)
  --reset-all        Réinitialise TOUS les produits à 0% (dangereux!)
  --keep-custom      Ne modifie que les produits avec marge = 25% (défaut)
  --no-keep-custom   Modifie tous les produits sauf ceux avec marge custom
  --help, -h         Affiche cette aide

Exemples:
  # Simulation (aucune modification)
  tsx scripts/migrate-margin-rate.ts --dry-run

  # Migration standard (recommandé)
  tsx scripts/migrate-margin-rate.ts --keep-custom

  # Réinitialiser TOUS les produits (dangereux!)
  tsx scripts/migrate-margin-rate.ts --reset-all
    `)
    process.exit(0)
  }

  migrateMarginRates(options)
    .then(() => {
      console.log()
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Migration échouée:', error)
      process.exit(1)
    })
}

export default migrateMarginRates
