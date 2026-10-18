/**
 * Carrousel de l'accueil DDM+ : thèmes de couleur et validation des slides.
 * Partagé par la vitrine, l'admin (aperçu) et l'API admin (validation).
 */

export type SlideThemeKey = 'emerald' | 'violet' | 'sunset' | 'ocean' | 'amber' | 'night'

export interface SlideTheme {
  label: string
  /** Fond du slide — classes complètes pour que Tailwind les génère */
  bg: string
  /** Pastille de choix dans l'admin */
  swatch: string
  /** Texte sombre sur fond clair (sinon texte blanc) */
  darkText: boolean
}

export const SLIDE_THEMES: Record<SlideThemeKey, SlideTheme> = {
  emerald: { label: 'Émeraude', bg: 'bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500', swatch: 'bg-gradient-to-br from-emerald-700 to-teal-500', darkText: false },
  violet: { label: 'Violet', bg: 'bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-500', swatch: 'bg-gradient-to-br from-violet-700 to-fuchsia-500', darkText: false },
  sunset: { label: 'Corail', bg: 'bg-gradient-to-br from-rose-600 via-pink-600 to-orange-500', swatch: 'bg-gradient-to-br from-rose-600 to-orange-500', darkText: false },
  ocean: { label: 'Océan', bg: 'bg-gradient-to-br from-blue-700 via-sky-600 to-cyan-500', swatch: 'bg-gradient-to-br from-blue-700 to-cyan-500', darkText: false },
  amber: { label: 'Soleil', bg: 'bg-gradient-to-br from-amber-300 via-amber-400 to-orange-400', swatch: 'bg-gradient-to-br from-amber-300 to-orange-400', darkText: true },
  night: { label: 'Nuit', bg: 'bg-gradient-to-br from-zinc-900 via-slate-800 to-emerald-900', swatch: 'bg-gradient-to-br from-zinc-900 to-emerald-900', darkText: false },
}

export const SLIDE_THEME_KEYS = Object.keys(SLIDE_THEMES) as SlideThemeKey[]

/**
 * `bgColor` contient soit une clé de thème, soit (anciennes slides) des classes
 * Tailwind pastel (« from-amber-50 via-yellow-50 … ») : on retrouve le thème par mot-clé.
 */
export function resolveSlideTheme(bgColor?: string | null): SlideThemeKey {
  const value = String(bgColor || '').toLowerCase()
  if ((SLIDE_THEME_KEYS as string[]).includes(value)) return value as SlideThemeKey
  if (/violet|purple|fuchsia/.test(value)) return 'violet'
  if (/rose|pink|red/.test(value)) return 'sunset'
  if (/blue|sky|cyan|indigo/.test(value)) return 'ocean'
  if (/amber|yellow|orange/.test(value)) return 'amber'
  if (/zinc|slate|gray|black|night/.test(value)) return 'night'
  return 'emerald'
}

/** Lien spécial : le bouton du slide ouvre la fenêtre « Trouvez-moi » (envoi de photo). */
export const SOURCING_LINK = '#trouvez-moi'

export const SLIDE_LINK_PRESETS: { label: string; value: string }[] = [
  { label: 'Tout le catalogue', value: '/produits' },
  { label: 'Achats groupés', value: '/achats-groupes' },
  { label: 'Trouvez-moi (envoi de photo)', value: SOURCING_LINK },
  { label: 'Acheter par lots', value: '/produits?moq=lot' },
  { label: 'Boutiques partenaires', value: '/market/boutiques' },
]

export const MAX_SLIDE_IMAGES = 3

// Les navigateurs retirent tabulations et retours ligne des URL (« /\t/site.com » devient « //site.com ») ;
// la barre oblique inverse est aussi lue comme « / ». On refuse donc ces caractères partout.
const UNSAFE_URL_CHARS = /[\u0000-\u001f\u007f\\]/

/** Lien interne (« /… »), lien Trouvez-moi ou URL https. Tout le reste (javascript:, //hôte…) est refusé. */
export function sanitizeSlideLink(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const link = raw.trim()
  if (!link || link.length > 500 || UNSAFE_URL_CHARS.test(link)) return null
  if (link === SOURCING_LINK) return link
  if (link.startsWith('/')) return link.startsWith('//') ? null : link
  try {
    const url = new URL(link)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function sanitizeSlideImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(value => !UNSAFE_URL_CHARS.test(value))
    .filter(value => (value.startsWith('/') && !value.startsWith('//')) || /^https:\/\//i.test(value))
    .filter(value => value.length <= 1000)
    .slice(0, MAX_SLIDE_IMAGES)
}

export interface SlideInput {
  title?: string
  subtitle?: string
  badge?: string
  ctaText?: string
  ctaLink?: string
  bgColor?: SlideThemeKey
  images?: string[]
  isActive?: boolean
  order?: number
  startDate?: Date | null
  endDate?: Date | null
}

/** Validation des données envoyées par l'admin. `partial` : mise à jour (champs absents ignorés). */
export function parseSlideInput(body: Record<string, unknown>, partial: boolean): { data: SlideInput; error?: string } {
  const data: SlideInput = {}
  const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

  if (!partial || body.title !== undefined) {
    const title = text(body.title, 120)
    if (!title) return { data, error: 'Le titre est obligatoire' }
    data.title = title
  }
  if (body.subtitle !== undefined) data.subtitle = text(body.subtitle, 240)
  if (body.badge !== undefined) data.badge = text(body.badge, 40)
  if (body.ctaText !== undefined) data.ctaText = text(body.ctaText, 40) || 'Découvrir'
  if (body.ctaLink !== undefined) {
    const link = sanitizeSlideLink(body.ctaLink)
    if (!link) return { data, error: 'Lien du bouton invalide : choisissez une page du site (/produits…) ou une adresse https://' }
    data.ctaLink = link
  }
  if (body.bgColor !== undefined) data.bgColor = resolveSlideTheme(typeof body.bgColor === 'string' ? body.bgColor : '')
  if (body.images !== undefined) data.images = sanitizeSlideImages(body.images)
  if (body.isActive !== undefined) data.isActive = !!body.isActive
  if (typeof body.order === 'number' && Number.isFinite(body.order)) data.order = Math.round(body.order)

  for (const key of ['startDate', 'endDate'] as const) {
    if (body[key] === undefined) continue
    if (!body[key]) { data[key] = null; continue }
    const date = new Date(String(body[key]))
    if (Number.isNaN(date.getTime())) return { data, error: key === 'startDate' ? 'Date de début invalide' : 'Date de fin invalide' }
    data[key] = date
  }
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    return { data, error: 'La date de fin doit être après la date de début' }
  }
  return { data }
}
