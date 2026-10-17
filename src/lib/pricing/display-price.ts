/**
 * Prix « tout compris » affiché au client.
 *
 * Le catalogue affichait `pricing.salePrice` (coût sourcing × (1 + marge)) alors
 * que le devis serveur facture `sourcing + frais de service + assurance (+ transport)`.
 * L'écart (~12,5% aux taux par défaut) n'apparaissait qu'au panier.
 *
 * `computeProductPricing` expose déjà le bon montant hors transport via
 * `totalWithFees` — uniquement renseigné pour les produits importés, les autres
 * ne portant pas de frais d'import. Ce module centralise la résolution pour que
 * carte, fiche produit et suggestions parlent d'une seule voix.
 *
 * Module volontairement sans dépendance (utilisable client et serveur).
 */

export interface DisplayFees {
  serviceFeeRate: number
  serviceFeeAmount: number
  insuranceRate: number
  insuranceAmount: number
}

export interface DisplayPricingInput {
  totalWithFees?: number | null
  salePrice?: number | null
  baseCost?: number | null
  fees?: DisplayFees | null
}

/**
 * Montant unitaire à afficher : marchandise + frais de service + assurance.
 * Le transport reste exclu (il dépend du mode choisi au panier) et doit être
 * annoncé comme tel à l'utilisateur.
 */
export function resolveDisplayPrice(
  pricing?: DisplayPricingInput | null,
  fallbackPrice?: number | null
): number {
  const candidates = [
    pricing?.totalWithFees,
    pricing?.salePrice,
    pricing?.baseCost,
    fallbackPrice,
  ]
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.round(value)
    }
  }
  return 0
}

/**
 * Facteur permettant de porter un prix exprimé au niveau marchandise (palier
 * quantité, prix de groupe) au niveau tout compris — le devis serveur applique
 * les frais sur le prix appliqué, paliers inclus.
 */
export function feeMultiplier(pricing?: DisplayPricingInput | null): number {
  const sale = pricing?.salePrice
  const allIn = pricing?.totalWithFees
  if (
    typeof sale === 'number' && sale > 0 &&
    typeof allIn === 'number' && allIn > 0
  ) {
    return allIn / sale
  }
  return 1
}

/** Porte un montant marchandise au niveau tout compris. */
export function toAllIn(amount: number | null | undefined, pricing?: DisplayPricingInput | null): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(amount * feeMultiplier(pricing))
}

/**
 * Libellé des frais inclus, pour l'affordance de transparence sous le prix.
 * Retourne null si le produit ne porte aucun frais d'import.
 */
export function describeIncludedFees(pricing?: DisplayPricingInput | null): string | null {
  const fees = pricing?.fees
  if (!fees) return null
  const parts: string[] = []
  if (fees.serviceFeeRate > 0) parts.push(`frais de service ${fees.serviceFeeRate}%`)
  if (fees.insuranceRate > 0) parts.push(`assurance ${fees.insuranceRate}%`)
  if (parts.length === 0) return null
  return parts.join(' + ')
}
