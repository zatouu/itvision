/**
 * Script pour activer l'achat groupé sur quelques produits
 * Usage: npx ts-node scripts/enable-group-buy.ts
 */

import { connectDB } from '../src/lib/db'
import Product from '../src/lib/models/Product'

async function enableGroupBuy() {
  await connectDB()
  console.log('✅ Connecté à MongoDB')

  // Récupérer quelques produits importés pour activer l'achat groupé
  const products = await Product.find({ 
    isPublished: true,
    'pricing.baseCost': { $gt: 0 }
  })
    .limit(10)
    .lean()

  console.log(`📦 ${products.length} produits trouvés`)

  if (products.length === 0) {
    console.log('❌ Aucun produit trouvé')
    process.exit(1)
  }

  let updated = 0

  for (const product of products) {
    // Générer des paliers de prix dégressifs basés sur le prix de base
    const basePrice = (product as any).pricing?.baseCost || (product as any).pricing?.salePrice || 10000
    
    const priceTiers = [
      { minQty: 5, maxQty: 9, price: Math.round(basePrice * 0.95), discount: 5 },
      { minQty: 10, maxQty: 24, price: Math.round(basePrice * 0.90), discount: 10 },
      { minQty: 25, maxQty: 49, price: Math.round(basePrice * 0.85), discount: 15 },
      { minQty: 50, maxQty: 99, price: Math.round(basePrice * 0.80), discount: 20 },
      { minQty: 100, price: Math.round(basePrice * 0.75), discount: 25 },
    ]

    await Product.findByIdAndUpdate((product as any)._id, {
      $set: {
        groupBuyEnabled: true,
        priceTiers,
        groupBuyMinQty: 10,
        groupBuyTargetQty: 50
      }
    })

    console.log(`✅ Achat groupé activé: ${(product as any).name}`)
    updated++
  }

  console.log(`\n🎉 ${updated} produits mis à jour avec l'achat groupé`)
  process.exit(0)
}

enableGroupBuy().catch(err => {
  console.error('❌ Erreur:', err)
  process.exit(1)
})
