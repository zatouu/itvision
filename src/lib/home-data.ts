// Data layer for the marketplace homepage (Alibaba/1688/Temu style)
// Mix of API helpers + static config. Product/group data fetched live from API.

export interface HomeProduct {
  id: string
  name: string
  image: string
  price: number
  originalPrice?: number
  currency: string
  rating?: number
  soldCount?: number
  stockLeft?: number
  badges?: string[]
  origin?: string
  deliveryDays?: number
}

export interface HomeGroupBuy {
  id: string
  productId: string
  name: string
  image: string
  currentPrice: number
  originalPrice: number
  currency: string
  currentQty: number
  targetQty: number
  participants: number
  deadline: string // ISO date
}

export interface ShowcaseCategory {
  label: string
  href: string
  image: string
  productCount: number
  color: string
}

export interface QuickCategory {
  label: string
  icon: string
  href: string
  color: string
}

export interface HeroSlide {
  title: string
  subtitle: string
  cta: string
  href: string
  gradient: string
  images: string[]
}

// ─── Hero Carousel Slides ───
export const heroSlides: HeroSlide[] = [
  {
    title: '🔥 Promo Black Friday Chine',
    subtitle: 'Jusqu\'à -60% sur 10 000 produits',
    cta: 'Voir les offres →',
    href: '/produits?promo=blackfriday',
    gradient: 'from-red-500 via-orange-500 to-amber-500',
    images: ['/placeholder.svg', '/placeholder.svg', '/placeholder.svg', '/placeholder.svg', '/placeholder.svg', '/placeholder.svg'],
  },
  {
    title: '🤝 Groupez-vous, économisez',
    subtitle: 'Jusqu\'à -45% en groupe sur l\'import',
    cta: 'Rejoindre un groupe',
    href: '/achats-groupes',
    gradient: 'from-emerald-500 via-green-500 to-teal-500',
    images: ['/placeholder.svg', '/placeholder.svg'],
  },
  {
    title: '📸 Pas trouvé ?',
    subtitle: 'Envoyez-nous une photo, on trouve le produit',
    cta: 'Essayer',
    href: '/trouver-pour-moi',
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    images: ['/placeholder.svg', '/placeholder.svg'],
  },
]

// ─── Quick Categories (12) ───
export const quickCategories: QuickCategory[] = [
  { label: 'Électronique', icon: 'Smartphone', href: '/produits?cat=electronique', color: 'text-blue-500' },
  { label: 'Mode', icon: 'Shirt', href: '/produits?cat=mode', color: 'text-pink-500' },
  { label: 'Maison', icon: 'Home', href: '/produits?cat=maison', color: 'text-orange-500' },
  { label: 'Beauté', icon: 'Sparkles', href: '/produits?cat=beaute', color: 'text-violet-500' },
  { label: 'Auto', icon: 'Car', href: '/produits?cat=auto', color: 'text-slate-700' },
  { label: 'Gaming', icon: 'Gamepad2', href: '/produits?cat=gaming', color: 'text-red-500' },
  { label: 'Sport', icon: 'Dumbbell', href: '/produits?cat=sport', color: 'text-emerald-500' },
  { label: 'Cuisine', icon: 'ChefHat', href: '/produits?cat=cuisine', color: 'text-amber-500' },
  { label: 'Bébé', icon: 'Baby', href: '/produits?cat=bebe', color: 'text-sky-500' },
  { label: 'Animaux', icon: 'Dog', href: '/produits?cat=animaux', color: 'text-yellow-500' },
  { label: 'Outils', icon: 'Wrench', href: '/produits?cat=outils', color: 'text-slate-600' },
  { label: 'Tout voir', icon: 'LayoutGrid', href: '/produits', color: 'text-emerald-600' },
]

// ─── Flash Sale Products ───
export const flashSaleProducts: HomeProduct[] = []

export const flashSaleEndTime = new Date(Date.now() + 2 * 60 * 60 * 1000 + 34 * 60 * 1000 + 18 * 1000).toISOString() // 02:34:18 from now

// ─── Active Group Buys ───
export const activeGroupBuys: HomeGroupBuy[] = []

// ─── Popular Products (multi-category) ───
export const popularProducts: HomeProduct[] = []

// ─── Showcase Categories (deprecated: use API) ───
export const showcaseCategories: ShowcaseCategory[] = []

// ─── Search Chips ───
export const searchChips = ['Caméra IP', 'Sac à main', 'Smartwatch', 'Cosmétique', 'Sneakers', 'Friteuse']

// ─── Product Tabs ───
export const productTabs = ['Tous', 'Mode', 'Maison', 'Tech', 'Beauté', 'Sport', 'Auto']

// ─── API Mapping helpers ───

export interface CatalogApiProduct {
  id: string
  _id: string
  name: string
  image?: string
  pricing?: {
    salePrice?: number
    baseCost?: number
    currency?: string
  }
  b2bPrice?: number
  isImported?: boolean
  availability?: {
    leadTimeDays?: number
    stockQuantity?: number
  }
  groupBuyEnabled?: boolean
  groupBuyBestPrice?: number
  groupBuyDiscount?: number
  category?: string
  isFeatured?: boolean
  rating?: number
  soldCount?: number
  createdAt?: string
}

export function mapCatalogToHomeProduct(p: CatalogApiProduct): HomeProduct {
  const salePrice = p.pricing?.salePrice ?? p.b2bPrice ?? 0
  const originalPrice = p.b2bPrice && p.b2bPrice > salePrice ? p.b2bPrice : undefined
  const discount = originalPrice ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0

  const badges: string[] = []
  if (discount > 0) badges.push(`-${discount}%`)
  if (p.groupBuyEnabled && p.groupBuyDiscount) badges.push(`Group -${p.groupBuyDiscount}%`)

  return {
    id: p.id ?? p._id,
    name: p.name,
    image: p.image ?? '/placeholder.svg',
    price: salePrice,
    originalPrice,
    currency: p.pricing?.currency ?? 'FCFA',
    rating: typeof p.rating === 'number' ? p.rating : undefined,
    soldCount: typeof p.soldCount === 'number' ? p.soldCount : undefined,
    stockLeft: typeof p.availability?.stockQuantity === 'number' ? p.availability.stockQuantity : undefined,
    badges: badges.length > 0 ? badges : undefined,
    origin: p.isImported ? 'Import Chine' : 'Stock Dakar',
    deliveryDays: p.availability?.leadTimeDays ?? 3,
  }
}

export function mapCatalogToFlashProduct(p: CatalogApiProduct): HomeProduct {
  const mapped = mapCatalogToHomeProduct(p)
  // Ne pas inventer de remise ou de stock fictif
  if (!mapped.originalPrice || mapped.originalPrice <= mapped.price) {
    mapped.originalPrice = undefined
  }
  return mapped
}
