/** Grille d'un fournisseur direct (usine) transcrite pour le catalogue DDM. */

export type SupplierVariant = [label: string, cny: number, moq: number, image?: string]

export interface SupplierFamily {
  key: string
  name: string
  /** Famille de l’arbre DDM (category-tree.ts) — ex. Sécurité & surveillance, Informatique */
  category: string
  subCategory: string
  /** Visible aussi sur le catalogue B2B IT Vision */
  corporate?: boolean
  image: string
  gallery?: string[]
  /** Poids d'expédition estimé de la variante par défaut (ajusté à la pesée) */
  weightKg: number
  /** Volume emballé d'une unité (m³) — requis pour proposer le maritime */
  volumeM3?: number
  /** Vendu par lot : le prix et le MOQ sont ramenés au lot (ex. sachet de 100 fiches) */
  packOf?: number
  /** Famille comparable relevée à Dakar : ses prix, ajustés au ratio des coûts, servent de référence */
  marketLike?: string
  /** Force le lot minimum DDM (sinon calculé par ddmMinOrderQty) */
  minOrderQty?: number
  variantGroup: string
  variants: SupplierVariant[]
  description: string
  features?: string[]
  specifications?: Record<string, string>
  tags?: string[]
}

export interface MarketPrice {
  /** Libellé de la variante comparable */
  variant: string
  fcfa: number
  shop: string
  url: string
  /** Poids de cette variante si différent du poids de la famille */
  kg?: number
}

export interface SupplierPricelist {
  id: string
  supplier: { name: string; contact: string; priceListDate: string; receivedAt: string }
  /** Dossier public des images extraites de la grille */
  imageBase: string
  families: SupplierFamily[]
  /** Prix de détail relevés au Sénégal, par clé de famille */
  market: Record<string, MarketPrice[]>
  /** Points à confirmer avec l'usine, par clé de famille */
  questions: Record<string, string>
}
