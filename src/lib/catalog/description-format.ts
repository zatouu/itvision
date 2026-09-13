/**
 * Formateur de description produit — nettoie les descriptions scrapées (1688/AliExpress)
 * et les structure en blocs typés pour un rendu premium façon Taobao.
 */

export type DescBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'specs'; items: [string, string][] }

// Bruit typique des imports scrapés : compteurs, prix, dates de promo, méta vendeur
const NOISE_PATTERNS = [
  /\d+(\s?[kKmM])?\+?\s*(vendus?|commandes?|articles? similaires)/i,
  /articles? similaires vendus/i,
  /(XOF|FCFA|USD|EUR|CNY|¥|US\$)\s*[\d\s.,]+/i,
  /\bSauvegarder\b/i,
  /Taxes? (exclues|incluses)/i,
  /Fins?\s*:/i,
  /GMT[+-]?\d*/i,
  /Vendu par/i,
  /Boutique\s*:/i,
  /Magasin\s+\S+\s*\(Trader\)/i,
  /^\d+\s*(images?|photos?|vidéos?)$/i,
  /^\d+\s*types? de variantes?$/i,
  /^\d+\s*couleurs?$/i,
  /ajouter au moment du paiement/i,
  /politique de confidentialité/i,
  /code promo/i,
  /nouvel utilisateur/i,
  /livraison gratuite dès/i,
]

/** Une ligne est-elle du bruit de scraping ? */
export function isScrapedNoise(line: string): boolean {
  const t = line.trim()
  if (!t) return true
  if (NOISE_PATTERNS.some(p => p.test(t))) return true
  // Ligne quasi-numérique (prix isolés, compteurs)
  if (/^[\d\s.,]+$/.test(t) && t.length < 12) return true
  return false
}

/** Nettoie une ligne : retire le markdown résiduel et les artefacts */
function cleanLine(line: string): string {
  return line
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\s*[-•–*]\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Sections typiques des fiches scrapées (mot seul sur sa ligne)
const SECTION_WORDS = new Set([
  'présentation', 'presentation', 'description', 'détails', 'details',
  'caractéristiques', 'caracteristiques', 'spécifications', 'specifications',
  'avantages', 'points forts', 'contenu du colis', 'contenu de la boîte',
  'matériaux', 'materiaux', 'dimensions', 'entretien', 'garantie',
])

const isHeading = (line: string): boolean => {
  const t = line.trim()
  if (/^\*\*[^*]+\*\*:?\s*$/.test(t)) return true // **Titre** seul sur sa ligne
  if (/^#{1,4}\s+/.test(t)) return true
  // Mot-section nu (« Présentation », « Caractéristiques »…)
  if (t.length <= 40 && !/[.!?]$/.test(t) && SECTION_WORDS.has(t.toLowerCase().replace(/[:\s]+$/,''))) return true
  return false
}

const headingText = (line: string): string =>
  cleanLine(line.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '').replace(/:\s*$/, ''))

const isBullet = (line: string): boolean => /^\s*[-•–*]\s+\S/.test(line)

// "Clé : valeur" plausible (clé courte, valeur non vide)
const SPEC_RE = /^([A-Za-zÀ-ÿ0-9 ()/%°+\-.]{2,40})\s*[:：]\s*(.{1,120})$/

/**
 * Transforme une description brute (éventuellement scrapée) en blocs structurés.
 * Les lignes de bruit sont supprimées ; les `Clé : valeur` deviennent des specs ;
 * le reste devient paragraphes / puces / titres.
 */
export function formatDescription(raw?: string | null): DescBlock[] {
  if (!raw) return []
  const lines = String(raw).split(/\r?\n+/)

  const blocks: DescBlock[] = []
  let bullets: string[] = []
  let specs: [string, string][] = []
  let para: string[] = []

  const flush = () => {
    if (para.length) {
      const text = para.join(' ').trim()
      if (text) blocks.push({ type: 'paragraph', text })
      para = []
    }
    if (bullets.length) {
      blocks.push({ type: 'bullets', items: bullets })
      bullets = []
    }
    if (specs.length) {
      blocks.push({ type: 'specs', items: specs })
      specs = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || isScrapedNoise(line)) continue

    if (isHeading(line)) {
      flush()
      const t = headingText(line)
      if (t) blocks.push({ type: 'heading', text: t })
      continue
    }

    if (isBullet(line)) {
      // Les puces clôturent paragraphe et specs en cours
      if (para.length || specs.length) flush()
      const t = cleanLine(line)
      if (t) bullets.push(t)
      continue
    }

    const specMatch = line.match(SPEC_RE)
    if (specMatch && !line.endsWith('.')) {
      const key = cleanLine(specMatch[1])
      const value = cleanLine(specMatch[2])
      if (key && value && !isScrapedNoise(value) && key.length <= 40) {
        // Une ligne "Clé: valeur" rejoint le bloc specs en cours (ou en démarre un)
        if (para.length || bullets.length) flush()
        specs.push([key, value])
        continue
      }
    }

    // Texte libre → paragraphe (clôt les listes en cours)
    if (bullets.length || specs.length) flush()
    para.push(cleanLine(line))
  }
  flush()

  return blocks
}

/** Filtre les entrées de specs/features qui sont des artefacts de scraping. */
export function filterSpecEntries(specs: [string, string][]): [string, string][] {
  return specs.filter(([k, v]) => {
    if (!k || !v) return false
    const joined = `${k}: ${v}`
    return !isScrapedNoise(joined) && !isScrapedNoise(k) && !isScrapedNoise(v)
  })
}
