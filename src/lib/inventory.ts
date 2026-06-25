import Product from '@/lib/models/Product'
import mongoose from 'mongoose'

export interface InventoryReservationItem {
  productId: string
  qty: number
  variantIds?: string[]
  restored?: boolean
}

function computeStockStatus(quantity: number): 'in_stock' | 'preorder' | 'out_of_stock' {
  if (quantity <= 0) return 'out_of_stock'
  return 'in_stock'
}

function findVariant(product: any, variantId: string): { groupIndex: number; variantIndex: number; variant: any } | null {
  if (!Array.isArray(product.variantGroups)) return null
  for (let g = 0; g < product.variantGroups.length; g++) {
    const group = product.variantGroups[g]
    if (!Array.isArray(group.variants)) continue
    for (let v = 0; v < group.variants.length; v++) {
      if (group.variants[v].id === variantId) {
        return { groupIndex: g, variantIndex: v, variant: group.variants[v] }
      }
    }
  }
  return null
}

function getVariantStock(product: any, variantId: string): number | null {
  const found = findVariant(product, variantId)
  if (!found) return null
  const stock = found.variant.stock
  return typeof stock === 'number' ? stock : null
}

export async function checkStockAvailability(
  productId: string,
  qty: number,
  variantIds?: string[]
): Promise<{ ok: boolean; available: number; reason?: string; productName?: string }> {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return { ok: false, available: 0, reason: 'Identifiant produit invalide' }
  }
  if (qty <= 0) {
    return { ok: false, available: 0, reason: 'Quantité invalide' }
  }

  const product = await Product.findOne({ _id: productId }).lean()
  if (!product) {
    return { ok: false, available: 0, reason: 'Produit introuvable' }
  }

  const productName = (product as any).name || 'Produit'

  // Produit en rupture de stock globale
  if ((product as any).stockStatus === 'out_of_stock') {
    return { ok: false, available: 0, reason: 'Produit en rupture de stock', productName }
  }

  // Si des variantes sont demandées, on vérifie d'abord leur stock propre
  const effectiveVariantIds = Array.isArray(variantIds) && variantIds.length > 0 ? variantIds : []
  if (effectiveVariantIds.length > 0) {
    for (const variantId of effectiveVariantIds) {
      const variantStock = getVariantStock(product, variantId)
      if (variantStock !== null && variantStock < qty) {
        return {
          ok: false,
          available: variantStock,
          reason: `Stock insuffisant pour la variante sélectionnée (disponible: ${variantStock})`,
          productName
        }
      }
    }
  }

  // Vérification du stock global (quantité totale)
  const globalStock = typeof (product as any).stockQuantity === 'number' ? (product as any).stockQuantity : 0
  if (globalStock < qty) {
    return {
      ok: false,
      available: globalStock,
      reason: `Stock insuffisant (disponible: ${globalStock})`,
      productName
    }
  }

  return { ok: true, available: globalStock, productName }
}

export async function decrementProductStock(
  productId: string,
  qty: number,
  variantIds?: string[]
): Promise<{ ok: boolean; error?: string }> {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return { ok: false, error: 'Identifiant produit invalide' }
  }
  if (qty <= 0) {
    return { ok: false, error: 'Quantité invalide' }
  }

  const effectiveVariantIds = Array.isArray(variantIds) && variantIds.length > 0 ? variantIds : []

  try {
    if (effectiveVariantIds.length > 0) {
      // Décrémenter le stock de chaque variante via arrayFilters
      for (const variantId of effectiveVariantIds) {
        const variantResult = await Product.findOneAndUpdate(
          { _id: productId, 'variantGroups.variants.id': variantId },
          { $inc: { 'variantGroups.$[group].variants.$[variant].stock': -qty } },
          {
            arrayFilters: [
              { 'group.variants.id': variantId },
              { 'variant.id': variantId }
            ],
            new: true
          }
        )
        if (!variantResult) {
          return { ok: false, error: `Variante ${variantId} introuvable ou stock déjà épuisé` }
        }
      }
    }

    // Décrémenter le stock global atomiquement et vérifier qu'on ne passe pas en négatif
    const product = await Product.findOneAndUpdate(
      { _id: productId, stockQuantity: { $gte: qty } },
      { $inc: { stockQuantity: -qty } },
      { new: true }
    )

    if (!product) {
      // Rollback des variantes si possible (best effort)
      if (effectiveVariantIds.length > 0) {
        for (const variantId of effectiveVariantIds) {
          await Product.findOneAndUpdate(
            { _id: productId, 'variantGroups.variants.id': variantId },
            { $inc: { 'variantGroups.$[group].variants.$[variant].stock': qty } },
            {
              arrayFilters: [
                { 'group.variants.id': variantId },
                { 'variant.id': variantId }
              ]
            }
          )
        }
      }
      return { ok: false, error: 'Stock global insuffisant ou produit introuvable' }
    }

    // Synchroniser le stockStatus si nécessaire
    const newStatus = computeStockStatus(product.stockQuantity || 0)
    if (product.stockStatus !== newStatus) {
      product.stockStatus = newStatus
      await product.save()
    }

    // Alertes admin : stock bas (seuil configurable, défaut 10)
    const lowStockThreshold = Number(process.env.LOW_STOCK_THRESHOLD) || 10
    if ((product.stockQuantity || 0) <= lowStockThreshold && (product.stockQuantity || 0) > 0) {
      console.warn(`[inventory] Stock bas: ${product.name} (ID: ${productId}) - ${product.stockQuantity} unité(s) restante(s)`)
    }

    return { ok: true }
  } catch (err) {
    console.error('[inventory] Erreur décrémentation stock:', err)
    return { ok: false, error: 'Erreur lors de la mise à jour du stock' }
  }
}

export async function restoreProductStock(
  productId: string,
  qty: number,
  variantIds?: string[]
): Promise<{ ok: boolean; error?: string }> {
  if (!mongoose.Types.ObjectId.isValid(productId) || qty <= 0) {
    return { ok: false, error: 'Paramètres invalides' }
  }

  const effectiveVariantIds = Array.isArray(variantIds) && variantIds.length > 0 ? variantIds : []

  try {
    const update: any = { $inc: { stockQuantity: qty } }
    const product = await Product.findOneAndUpdate({ _id: productId }, update, { new: true })
    if (!product) {
      return { ok: false, error: 'Produit introuvable' }
    }

    if (effectiveVariantIds.length > 0) {
      for (const variantId of effectiveVariantIds) {
        await Product.findOneAndUpdate(
          { _id: productId, 'variantGroups.variants.id': variantId },
          { $inc: { 'variantGroups.$[group].variants.$[variant].stock': qty } },
          {
            arrayFilters: [
              { 'group.variants.id': variantId },
              { 'variant.id': variantId }
            ]
          }
        )
      }
    }

    const newStatus = computeStockStatus(product.stockQuantity || 0)
    if (product.stockStatus !== newStatus) {
      product.stockStatus = newStatus
      await product.save()
    }

    return { ok: true }
  } catch (err) {
    console.error('[inventory] Erreur restauration stock:', err)
    return { ok: false, error: 'Erreur lors de la restauration du stock' }
  }
}
