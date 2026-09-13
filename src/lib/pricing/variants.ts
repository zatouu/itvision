/**
 * Prédicats purs sur les variantes produit — aucune dépendance DB.
 * Partagés par le devis (quote-cart), l'inventaire et l'éligibilité group-buy.
 */

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
