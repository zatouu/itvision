/**
 * Prédicats purs sur les variantes produit — aucune dépendance DB.
 * Partagés par le devis (quote-cart), l'inventaire et l'éligibilité group-buy.
 */

import { z } from 'zod'

const configurationSchema = z.object({
  stockStatus: z.enum(['in_stock', 'preorder', 'out_of_stock']).optional(),
  stockQuantity: z.number().int().nonnegative().nullish(),
  minOrderQty: z.number().int().min(1).max(10000).optional(),
  isPublished: z.boolean().optional(),
  variantGroups: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    variants: z.array(z.object({
      id: z.string().trim().max(128).optional(),
      name: z.string().trim().min(1).max(200),
      stock: z.number().int().nonnegative().nullish(),
      price1688: z.number().finite().nonnegative().nullish(),
      priceFCFA: z.number().finite().nonnegative().nullish(),
    })).min(1).max(200),
  })).max(10).optional(),
})

export function productConfigurationError(value: unknown, validatePublication = true): string | null {
  const parsed = configurationSchema.safeParse(value)
  if (!parsed.success) return `Configuration invalide : ${parsed.error.issues[0].path.join('.')}. Vérifiez les noms, les quantités et les prix.`
  const product = parsed.data
  const names = new Set<string>()
  const ids = new Set<string>()
  for (const group of product.variantGroups || []) {
    const name = group.name.toLocaleLowerCase('fr')
    if (names.has(name)) return 'Chaque groupe de variantes doit avoir un nom distinct.'
    names.add(name)
    for (const option of group.variants) {
      if (option.id && ids.has(option.id)) return 'Chaque variante doit avoir un identifiant distinct.'
      if (option.id) ids.add(option.id)
    }
  }
  if (validatePublication && product.isPublished && product.stockStatus === 'in_stock') {
    const minimum = product.minOrderQty ?? 1
    if ((product.stockQuantity ?? 0) < minimum) return 'Le stock Dakar est inférieur au lot minimum. Corrigez le stock ou la disponibilité avant publication.'
    if (product.variantGroups?.some(group => group.variants.every(option => typeof option.stock === 'number' && option.stock < minimum))) {
      return 'Un groupe ne propose aucune variante disponible pour le lot minimum.'
    }
  }
  return null
}

export function productHasVariantGroups(db: any): boolean {
  return Array.isArray(db?.variantGroups) &&
    db.variantGroups.some((g: any) => Array.isArray(g?.variants) && g.variants.length > 0)
}

/**
 * Le produit a-t-il des variantes avec leur propre coût sourcing ?
 * Un achat groupé ne porte pas de sélection de variante : autoriser un
 * groupe sur un tel produit facturerait le prix de base pour une variante
 * potentiellement plus chère → ces produits sont exclus du group-buy.
 */
export function productHasPricedVariants(db: any): boolean {
  if (!productHasVariantGroups(db)) return false
  return db.variantGroups.some((g: any) =>
    (Array.isArray(g?.variants) ? g.variants : []).some(
      (v: any) =>
        (typeof v?.priceFCFA === 'number' && v.priceFCFA > 0) ||
        (typeof v?.price1688 === 'number' && v.price1688 > 0)
    )
  )
}
