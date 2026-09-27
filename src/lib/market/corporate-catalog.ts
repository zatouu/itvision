/**
 * Catalogue B2B « IT Vision » — règle métier unique.
 *
 * ⚠️ RÈGLE : les clients entreprises ne voient QUE les produits IT Vision.
 * Un produit de vendeur tiers (`shopId` renseigné, créé via /api/vendor/products)
 * est EXCLU du catalogue corporate, même s'il est taggé `corporateVisible` :
 * l'exposer reviendrait à mettre les clients B2B d'IT Vision face à la
 * concurrence directe des vendeurs DDM+.
 *
 * La curation ITV reste possible sur ses propres produits :
 *   - `corporateVisible: true`  → mis en avant B2B
 *   - `channels: ['corporate']` → publié aussi sur le canal corporate
 *   - fallback : produits ITV des catégories tech avec un prix (historique)
 *
 * Utilisé par la vitrine publique (/corporate-produits) et l'API
 * (/api/corporate/products) — une seule source pour éviter les divergences.
 */

/** Termes de recherche des catégories tech ITV (fallback historique). */
export const CORPORATE_CATEGORY_TERMS = Array.from(new Set([
  'camera', 'caméra', 'videosurveillance', 'vidéosurveillance', 'cctv', 'hikvision', 'dahua', 'nvr', 'dvr',
  "contrôle d'accès", "controle d'acces", 'biométrique', 'biometrique', 'badge', 'rfid', 'serrure', 'empreinte', 'pointeuse', 'badgeuse',
  'alarme', 'alarm', 'détecteur', 'detecteur', 'sirène', 'sirene', 'intrusion', 'capteur',
  'réseau', 'reseau', 'wifi', 'wi-fi', 'switch', 'poe', 'routeur', 'câble', 'cable', 'onduleur', 'ups', 'serveur',
  'domotique', 'smart home', 'maison intelligente', 'automatisation', 'tuya', 'zigbee', 'sonoff',
  'gadget', 'accessoire', 'objet connecté', 'support', 'adaptateur',
  'incendie', 'fumée', 'fumee', 'extincteur', 'détection incendie',
]))

export function corporateCategoryRegexes(): RegExp[] {
  return CORPORATE_CATEGORY_TERMS.map(t => new RegExp(escapeRegex(t), 'i'))
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Boutiques ITV (si un jour la boutique officielle est un Shop DDM+). */
export function itvShopIds(): string[] {
  return (process.env.ITV_SHOP_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

/** Clause « produit ITV » : pas de shopId (produit ITV) ou boutique ITV déclarée. */
export function itvOwnProductClause(): Record<string, unknown> {
  const ids = itvShopIds()
  return {
    $or: [
      { shopId: { $exists: false } },
      { shopId: null },
      ...(ids.length > 0 ? [{ shopId: { $in: ids } }] : []),
    ],
  }
}

export interface CorporateCatalogParams {
  /** Recherche texte sur le nom (optionnelle). */
  search?: string
  /** Filtre catégorie exacte (optionnel). */
  category?: string
  /** Inclure le fallback catégories tech (défaut true — comportement vitrine). */
  includeCategoryFallback?: boolean
}

/**
 * Filtre Mongo du catalogue corporate. Retourne un filtre prêt pour
 * `Product.find(...)`.
 */
export function corporateCatalogFilter(params: CorporateCatalogParams = {}): Record<string, unknown> {
  const { search, category, includeCategoryFallback = true } = params

  const and: Record<string, unknown>[] = [itvOwnProductClause()]

  const curated = { $or: [{ corporateVisible: true }, { channels: { $in: ['corporate'] } }] }
  if (includeCategoryFallback) {
    const fallback = {
      $and: [
        { category: { $in: corporateCategoryRegexes() } },
        { $or: [{ b2bPrice: { $gt: 0 } }, { price: { $gt: 0 } }] },
      ],
    }
    and.push({ $or: [curated, fallback] })
  } else {
    and.push(curated)
  }

  if (search) and.push({ name: new RegExp(escapeRegex(search), 'i') })
  if (category) and.push({ category: new RegExp(`^${escapeRegex(category)}$`, 'i') })

  return { isPublished: { $ne: false }, $and: and }
}
