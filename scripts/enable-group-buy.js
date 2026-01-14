#!/usr/bin/env node
/**
 * Script pour activer l'achat groupé sur des produits
 * Usage: 
 *   node scripts/enable-group-buy.js                    # Active sur les 5 premiers produits
 *   node scripts/enable-group-buy.js "nom produit"      # Active sur les produits matchant le nom
 *   node scripts/enable-group-buy.js --id 507f1f77bcf86cd799439011   # Active sur un produit par ID
 */

const mongoose = require('mongoose')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/itvision_db'

// Schema minimal pour le produit
const ProductSchema = new mongoose.Schema({}, { strict: false })

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connecté à MongoDB')

  const Product = mongoose.model('Product', ProductSchema, 'products')

  // Parser les arguments
  const args = process.argv.slice(2)
  let query = {}
  let limit = 5

  if (args.includes('--id')) {
    const idIndex = args.indexOf('--id')
    const id = args[idIndex + 1]
    if (!id) {
      console.error('❌ ID manquant après --id')
      process.exit(1)
    }
    query = { _id: new mongoose.Types.ObjectId(id) }
    limit = 1
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    // Recherche par nom
    const searchTerm = args.join(' ')
    query = { name: { $regex: searchTerm, $options: 'i' } }
    limit = 20
    console.log(`🔍 Recherche de produits contenant: "${searchTerm}"`)
  }

  // Récupérer les produits
  const products = await Product.find(query).limit(limit).lean()

  if (products.length === 0) {
    console.log('❌ Aucun produit trouvé')
    
    // Afficher quelques produits disponibles
    const available = await Product.find({}).select('name').limit(10).lean()
    if (available.length > 0) {
      console.log('\n📦 Produits disponibles:')
      available.forEach(p => console.log(`  - ${p.name}`))
    } else {
      console.log('⚠️  La base de données ne contient aucun produit.')
      console.log('   Lancez d\'abord un seed ou importez des produits.')
    }
    
    await mongoose.disconnect()
    process.exit(1)
  }

  console.log(`\n📦 ${products.length} produit(s) trouvé(s):`)
  products.forEach(p => {
    console.log(`  - ${p.name} (groupBuyEnabled: ${p.groupBuyEnabled || false})`)
  })

  // Activer l'achat groupé
  let updated = 0

  for (const product of products) {
    // Calculer le prix de base
    const basePrice = product.pricing?.salePrice || 
                      product.price || 
                      product.baseCost || 
                      product.pricing?.baseCost ||
                      50000

    // Générer des paliers de prix dégressifs
    const priceTiers = [
      { minQty: 5, maxQty: 9, price: Math.round(basePrice * 0.95), discount: 5 },
      { minQty: 10, maxQty: 24, price: Math.round(basePrice * 0.90), discount: 10 },
      { minQty: 25, maxQty: 49, price: Math.round(basePrice * 0.85), discount: 15 },
      { minQty: 50, maxQty: 99, price: Math.round(basePrice * 0.80), discount: 20 },
      { minQty: 100, price: Math.round(basePrice * 0.75), discount: 25 },
    ]

    await Product.updateOne(
      { _id: product._id },
      {
        $set: {
          groupBuyEnabled: true,
          priceTiers,
          groupBuyMinQty: 10,
          groupBuyTargetQty: 50
        }
      }
    )

    console.log(`✅ Achat groupé activé: ${product.name} (prix base: ${basePrice.toLocaleString()} FCFA)`)
    updated++
  }

  console.log(`\n🎉 ${updated} produit(s) mis à jour avec l'achat groupé`)

  // Afficher les stats finales
  const totalWithGroupBuy = await Product.countDocuments({ groupBuyEnabled: true })
  console.log(`📊 Total produits avec achat groupé: ${totalWithGroupBuy}`)

  await mongoose.disconnect()
}

main().catch(err => {
  console.error('❌ Erreur:', err.message)
  process.exit(1)
})
