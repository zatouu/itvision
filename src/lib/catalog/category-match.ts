/**
 * Correspondance taxonomie ↔ catégories produit en texte libre.
 * Les produits importés portent des `category` libres (« Caméra Automatique »,
 * « Catalogue import Chine »…) qui ne matchent pas les slugs taxonomie.
 * Ce matcher par mots-clés relie les deux mondes — utilisé par le filtre
 * catalogue et la section « Catégories populaires » de l'accueil.
 */

const KEYWORDS: Record<string, string[]> = {
  securite: [
    'secur', 'camera', 'caméra', 'surveillance', 'serrure', 'alarme', 'video',
    'vidéo', 'detecteur', 'détecteur', 'interphone', 'badge', 'controle acces',
    'contrôle accès', 'biometr', 'biométr', 'espion', 'gps tracker', 'tracker',
  ],
  informatique: [
    'informat', 'ordinateur', 'laptop', 'pc ', 'clavier', 'souris', 'ssd',
    'disque dur', 'imprimante', 'bureau', 'bureautique', 'manette', 'portable',
    'gaming', 'box tv', 'tablette', 'ecran', 'écran', 'usb', 'hub', 'nvme',
    'ram ', 'carte mere', 'webcam', 'casque', 'headset', 'moniteur',
  ],
  domotique: [
    'domotique', 'smart home', 'tuya', 'ampoule connect', 'prise connect',
    'capteur', 'thermostat', 'interrupteur', 'maison connect', 'zigbee',
    'smart lock', 'sonnette', 'volet',
  ],
  electronique: [
    'electron', 'électron', 'ecouteur', 'écouteur', 'earbud', 'montre connect',
    'smartwatch', 'smartphone', 'telephone', 'téléphone', 'chargeur', 'cable',
    'câble', 'bluetooth', 'enceinte', 'projecteur', 'drone', 'bracelet',
    'audio', 'micro', 'powerbank', 'power bank', 'lunette', 'console',
    'pod', 'enceinte', 'haut-parleur', 'radio', 'tv ',
  ],
  mobilier: [
    'mobilier', 'fauteuil', 'meuble', 'bureau', 'chaise', 'table', 'etagere',
    'étagère', 'canape', 'canapé', 'lit ', 'armoire', 'installation', 'rangement',
    'tabouret', 'commode', 'luminaire', 'lampe', 'decoration', 'décoration',
    'maison', 'cuisine', 'ménager', 'menager', 'aspirateur', 'onduleur',
  ],
  'packs-cadeaux': [
    'pack', 'cadeau', 'coffret', 'combo', 'bundle', 'kit ', 'set de', 'lot de',
  ],
}

const normalize = (s?: string | null) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const keywordCache = new Map<string, RegExp[]>()

function patternsFor(slug: string): RegExp[] {
  let pats = keywordCache.get(slug)
  if (!pats) {
    pats = (KEYWORDS[slug] || []).map((k) => new RegExp(k, 'i'))
    keywordCache.set(slug, pats)
  }
  return pats
}

/**
 * Un produit appartient à une catégorie taxonomie si son champ `category`
 * OU son nom contient un mot-clé de la catégorie. Le slug exact reste accepté
 * (produits correctement taggés).
 */
export function productMatchesCategory(
  product: { category?: string | null; name?: string | null },
  categorySlug: string
): boolean {
  if (!categorySlug) return false
  const catText = normalize(product.category)
  if (catText === categorySlug) return true
  const haystack = `${catText} ${normalize(product.name)}`
  return patternsFor(categorySlug).some((re) => re.test(haystack))
}

/** Compte les produits correspondant à chaque slug de catégorie. */
export function countProductsByCategory<T extends { category?: string | null; name?: string | null }>(
  products: T[],
  slugs: string[]
): Map<string, { count: number; image?: string }> {
  const result = new Map<string, { count: number; image?: string }>()
  for (const slug of slugs) result.set(slug, { count: 0 })
  for (const p of products) {
    for (const slug of slugs) {
      if (productMatchesCategory(p, slug)) {
        const entry = result.get(slug)!
        entry.count += 1
        if (!entry.image && (p as any).image) entry.image = (p as any).image
      }
    }
  }
  return result
}
