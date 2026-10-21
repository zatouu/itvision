import { computeEffectivePricing, resolveItemVariants } from '@/lib/pricing/quote-cart'

/**
 * Prix unitaire d'un participant au volume groupe donné.
 * Les paliers figés sur le groupe (snapshot à la création) sont définis sur le
 * prix de base : ils sont mis à l'échelle du prix de la variante choisie —
 * un participant sur une variante plus chère paie le palier correspondant.
 */
export function groupParticipantUnitPrice(
  product: any,
  snapshotBasePrice: number,
  snapshotTiers: { minQty?: number; price?: number }[] | undefined,
  variantIds: string[] | undefined,
  groupTotalQty: number
): number {
  const base = computeEffectivePricing(product, undefined).displayPrice
  const eff = computeEffectivePricing(product, variantIds)
  const scale = base > 0 ? eff.displayPrice / base : 1

  const tiers = Array.isArray(snapshotTiers) ? snapshotTiers : []
  const sorted = [...tiers].sort((a, b) => (b.minQty || 0) - (a.minQty || 0))
  for (const t of sorted) {
    if (groupTotalQty >= (t.minQty || 0) && typeof t.price === 'number') {
      return Math.round(t.price * scale)
    }
  }
  const fallback = snapshotBasePrice > 0 ? snapshotBasePrice : eff.displayPrice
  return Math.round(fallback * scale)
}

/**
 * Valide la sélection de variantes d'un participant contre le produit.
 * Fail-closed : variante inconnue ou produit à groupes sans sélection → erreur.
 */
export function validateGroupVariantSelection(
  product: any,
  variantIds: string[] | undefined
): { variantIds: string[]; variantLabels: string[] } | { error: string } {
  const groups = (Array.isArray(product?.variantGroups) ? product.variantGroups : [])
    .filter((g: any) => Array.isArray(g?.variants) && g.variants.length > 0)
  const ids = Array.isArray(variantIds) ? variantIds.filter(Boolean) : []

  if (groups.length > 0) {
    // Une option par groupe requise (Couleur + Taille, pas seulement l'une).
    const missingGroups = groups.filter(
      (g: any) => !ids.some((id) => g.variants.some((v: any) => v?.id === id))
    )
    if (missingGroups.length > 0) {
      return { error: `Sélectionnez une option pour : ${missingGroups.map((g: any) => g.name || 'Variante').join(', ')}` }
    }
  }
  if (ids.length === 0) return { variantIds: [], variantLabels: [] }

  const { variants, missing } = resolveItemVariants(product, ids)
  if (missing.length > 0 || variants.length !== ids.length) {
    return { error: 'Variante inconnue pour ce produit' }
  }
  return {
    variantIds: ids,
    variantLabels: variants.map((v) => `${v.groupName}: ${v.name}`),
  }
}
