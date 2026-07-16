/**
 * Synonym expansion for catalog search.
 * Used as a lightweight fallback before a dedicated search engine
 * (Meilisearch / Algolia) is configured.
 */

export const SYNONYMS: Record<string, string[]> = {
  // Electronics
  iphone: ['apple', 'smartphone', 'téléphone', 'portable'],
  samsung: ['galaxy', 'smartphone', 'android', 'téléphone'],
  telephone: ['téléphone', 'tél', 'phone', 'smartphone', 'portable'],
  téléphone: ['telephone', 'tél', 'phone', 'smartphone', 'portable'],
  pc: ['ordinateur', 'laptop', 'portable', 'computer'],
  ordinateur: ['pc', 'laptop', 'portable', 'computer'],
  laptop: ['pc', 'ordinateur', 'portable'],
  casque: ['écouteurs', 'écouteur', 'headphones', 'audio', 'headset'],
  écouteurs: ['casque', 'écouteur', 'headphones', 'audio'],
  chargeur: ['cable', 'câble', 'usb', 'adaptateur'],
  cable: ['câble', 'chargeur', 'usb', 'fil'],
  // Fashion
  chaussure: ['basket', 'sneakers', 'escarpins', 'sandales', 'chaussures'],
  basket: ['chaussure', 'sneakers', 'chaussures'],
  robe: ['vêtement', 'mode', 'tenue', 'habit'],
  // Home / Auto
  maison: ['décoration', 'meuble', 'intérieur', 'mobilier'],
  voiture: ['auto', 'automobile', 'véhicule'],
  moto: ['scooter', 'vélo', 'deux-roues'],
  // Generic
  'pas cher': ['discount', 'bon marché', 'promo', 'bon plan'],
  'livraison rapide': ['stock dakar', 'disponible'],
}

function normalizeForLookup(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
}

export function expandToken(token: string): string[] {
  const normalized = normalizeForLookup(token)
  const results = new Set<string>([token, normalized])

  // Direct synonym map (normalized key)
  const direct = SYNONYMS[normalized] || SYNONYMS[token.toLowerCase()]
  if (direct) {
    for (const synonym of direct) results.add(synonym)
  }

  // Add de-accented versions of all synonyms
  for (const existing of Array.from(results)) {
    results.add(normalizeForLookup(existing))
    const expanded = SYNONYMS[existing]
    if (expanded) {
      for (const synonym of expanded) {
        results.add(synonym)
        results.add(normalizeForLookup(synonym))
      }
    }
  }

  // Strip empty / duplicates
  return Array.from(results).filter(Boolean)
}

export function tokenizeQuery(query: string): string[] {
  return query
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1)
}

export function expandQuery(query: string): string[] {
  const tokens = tokenizeQuery(query)
  const expanded = new Set<string>()
  for (const token of tokens) {
    for (const variant of expandToken(token)) {
      expanded.add(variant)
    }
  }
  return Array.from(expanded).filter((v) => v.length >= 1)
}
