import Product from '@/lib/models/Product'
import mongoose from 'mongoose'
import { productHasVariantGroups } from '@/lib/pricing/variants'

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

  const effectiveVariantIds = Array.isArray(variantIds) ? variantIds.filter(Boolean) : []

  // Validation fail-closed : un produit à variantes exige une sélection, et tout
  // id demandé doit exister sur CE produit (sinon : commande à variante fantôme).
  if (productHasVariantGroups(product)) {
    if (effectiveVariantIds.length === 0) {
      return { ok: false, available: 0, reason: 'Veuillez sélectionner une variante', productName }
    }
    for (const variantId of effectiveVariantIds) {
      if (!findVariant(product, variantId)) {
        return { ok: false, available: 0, reason: 'Variante sélectionnée invalide', productName }
      }
    }
  }

  // Le stock n'est contraignant que pour les produits en stock local (`in_stock`).
  // Un produit `preorder` est sourcé à la demande (import) : stockQuantity reste
  // à 0 et les stocks variantes sont indicatifs — ne jamais bloquer la commande.
  if ((product as any).stockStatus === 'in_stock') {
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

  return { ok: true, available: Number.MAX_SAFE_INTEGER, productName }
}

const VARIANT_DECREMENT = (qty: number) => ({
  $inc: { 'variantGroups.$[group].variants.$[variant].stock': qty },
})

const variantArrayFilters = (variantId: string) => [
  { 'group.variants.id': variantId },
  { 'variant.id': variantId },
]

/**
 * Filtre de requête garantissant le stock — la contrainte DOIT être dans le
 * filtre (pas dans arrayFilters) : un arrayFilter qui ne matche rien produit un
 * no-op silencieux et findOneAndUpdate retourne quand même le document.
 */
const variantStockFilter = (productId: string, variantId: string, minQty: number) => ({
  _id: productId,
  variantGroups: {
    $elemMatch: {
      variants: { $elemMatch: { id: variantId, stock: { $gte: minQty } } },
    },
  },
})

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

  const effectiveVariantIds = Array.isArray(variantIds) ? variantIds.filter(Boolean) : []

  try {
    const current = await Product.findOne({ _id: productId }).lean()
    if (!current) {
      return { ok: false, error: 'Produit introuvable' }
    }

    // Preorder = sourcé à la demande (import) : aucun stock physique à réserver.
    // Le statut est la source de vérité — stockQuantity reste à 0 sur ces produits.
    if ((current as any).stockStatus === 'preorder') {
      return { ok: true }
    }

    // Fail closed : les variantes demandées doivent exister sur ce produit.
    if (productHasVariantGroups(current)) {
      for (const variantId of effectiveVariantIds) {
        if (!findVariant(current, variantId)) {
          return { ok: false, error: `Variante ${variantId} invalide pour ce produit` }
        }
      }
    }

    const decrementedVariantIds: string[] = []
    const rollbackVariants = async () => {
      for (const variantId of decrementedVariantIds) {
        await Product.findOneAndUpdate(
          { _id: productId, 'variantGroups.variants.id': variantId },
          VARIANT_DECREMENT(qty),
          { arrayFilters: variantArrayFilters(variantId) }
        ).catch(() => {})
      }
    }

    if (effectiveVariantIds.length > 0) {
      // Décrément atomique GARDÉ (variant.stock >= qty dans le filtre) : empêche
      // l'oversell — deux commandes simultanées ne passent plus toutes les deux.
      // Seules les variantes à stock numérique sont décrémentées (stock géré).
      for (const variantId of effectiveVariantIds) {
        const found = findVariant(current, variantId)
        if (!found || typeof found.variant?.stock !== 'number') continue
        const variantResult = await Product.findOneAndUpdate(
          variantStockFilter(productId, variantId, qty),
          VARIANT_DECREMENT(-qty),
          { arrayFilters: variantArrayFilters(variantId), new: true }
        )
        if (!variantResult) {
          await rollbackVariants()
          return { ok: false, error: `Stock insuffisant pour la variante ${variantId}` }
        }
        decrementedVariantIds.push(variantId)
      }
    }

    // Décrémenter le stock global atomiquement et vérifier qu'on ne passe pas en négatif
    const product = await Product.findOneAndUpdate(
      { _id: productId, stockQuantity: { $gte: qty } },
      { $inc: { stockQuantity: -qty } },
      { new: true }
    )

    if (!product) {
      await rollbackVariants()
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

  const effectiveVariantIds = Array.isArray(variantIds) ? variantIds.filter(Boolean) : []

  try {
    // Symétrique au décrément : un produit preorder n'a rien à restituer.
    const current = await Product.findOne({ _id: productId }).lean()
    if (!current) {
      return { ok: false, error: 'Produit introuvable' }
    }
    if ((current as any).stockStatus === 'preorder') {
      return { ok: true }
    }

    const update: any = { $inc: { stockQuantity: qty } }
    const product = await Product.findOneAndUpdate({ _id: productId }, update, { new: true })
    if (!product) {
      return { ok: false, error: 'Produit introuvable' }
    }

    if (effectiveVariantIds.length > 0) {
      // Ne restituer que les variantes à stock géré (numérique) — symétrique.
      for (const variantId of effectiveVariantIds) {
        const found = findVariant(current, variantId)
        if (!found || typeof found.variant?.stock !== 'number') continue
        await Product.findOneAndUpdate(
          { _id: productId, 'variantGroups.variants.id': variantId },
          VARIANT_DECREMENT(qty),
          { arrayFilters: variantArrayFilters(variantId) }
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
