import { apiGet } from './api'
import { cacheGet, cacheSet } from './storage'

const CACHE_KEY = 'service-categories'
const TTL = 10 * 60 * 1000 // 10 min

export interface SubCategory {
  slug: string
  label_fr: string
  label_wo?: string
  label_en?: string
}

export interface ServiceCategory {
  slug: string
  label_fr: string
  label_wo?: string
  label_en?: string
  abbr: string
  color: string
  icon?: string
  order: number
  subCategories: SubCategory[]
}

// Hardcoded fallback (offline / first boot)
const FALLBACK: ServiceCategory[] = [
  { slug: 'electricite', label_fr: 'Électricité', label_wo: 'Kuuraŋ', label_en: 'Electrical', abbr: 'EL', color: '#1D4ED8', order: 1, subCategories: [] },
  { slug: 'plomberie', label_fr: 'Plomberie', label_wo: 'Robine', label_en: 'Plumbing', abbr: 'PL', color: '#0369A1', order: 2, subCategories: [] },
  { slug: 'menuiserie', label_fr: 'Menuiserie', label_wo: 'Bënu-bant', label_en: 'Carpentry', abbr: 'ME', color: '#92400E', order: 3, subCategories: [] },
  { slug: 'peinture', label_fr: 'Peinture', label_wo: 'Pentur', label_en: 'Painting', abbr: 'PE', color: '#6D28D9', order: 4, subCategories: [] },
  { slug: 'climatisation', label_fr: 'Climatisation', label_wo: 'Klima', label_en: 'HVAC', abbr: 'CL', color: '#0891B2', order: 5, subCategories: [] },
  { slug: 'securite', label_fr: 'Sécurité', label_wo: 'Kaarange', label_en: 'Security', abbr: 'SE', color: '#065F46', order: 6, subCategories: [] },
]

let _cached: ServiceCategory[] | null = null

export async function loadCategories(): Promise<ServiceCategory[]> {
  // 1. Try in-memory
  if (_cached) return _cached

  // 2. Try AsyncStorage cache
  const stored = await cacheGet<ServiceCategory[]>(CACHE_KEY)
  if (stored) {
    _cached = stored
    // Revalidate in background
    fetchRemote().catch(() => {})
    return stored
  }

  // 3. Fetch from API
  try {
    const cats = await fetchRemote()
    return cats
  } catch {
    return FALLBACK
  }
}

async function fetchRemote(): Promise<ServiceCategory[]> {
  const res = await apiGet('/api/services/categories')
  const cats: ServiceCategory[] = res.categories || []
  if (cats.length > 0) {
    _cached = cats
    await cacheSet(CACHE_KEY, cats, TTL)
  }
  return cats.length > 0 ? cats : FALLBACK
}

/** Get label for current locale */
export function getCategoryLabel(cat: ServiceCategory, lang: string): string {
  if (lang === 'wo' && cat.label_wo) return cat.label_wo
  if (lang === 'en' && cat.label_en) return cat.label_en
  return cat.label_fr
}

/** Get sub-category label for current locale */
export function getSubCategoryLabel(sub: SubCategory, lang: string): string {
  if (lang === 'wo' && sub.label_wo) return sub.label_wo
  if (lang === 'en' && sub.label_en) return sub.label_en
  return sub.label_fr
}
