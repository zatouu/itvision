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
    images: ['/file.svg', '/file.svg', '/file.svg', '/file.svg', '/file.svg', '/file.svg'],
  },
  {
    title: '🤝 Groupez-vous, économisez',
    subtitle: 'Jusqu\'à -45% en groupe sur l\'import',
    cta: 'Rejoindre un groupe',
    href: '/achats-groupes',
    gradient: 'from-emerald-500 via-green-500 to-teal-500',
    images: ['/file.svg', '/file.svg'],
  },
  {
    title: '📸 Pas trouvé ?',
    subtitle: 'Envoyez-nous une photo, on trouve le produit',
    cta: 'Essayer',
    href: '/trouver-pour-moi',
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    images: ['/file.svg', '/file.svg'],
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
export const flashSaleProducts: HomeProduct[] = [
  { id: 'f1', name: 'Sac à main premium', image: '/file.svg', price: 9900, originalPrice: 19800, currency: 'FCFA', stockLeft: 12, badges: ['-50%'] },
  { id: 'f2', name: 'Blender multifonction 1000W', image: '/file.svg', price: 9900, originalPrice: 19800, currency: 'FCFA', stockLeft: 8, badges: ['-50%'] },
  { id: 'f3', name: 'Casque gaming surround', image: '/file.svg', price: 7500, originalPrice: 15000, currency: 'FCFA', stockLeft: 23, badges: ['-50%'] },
  { id: 'f4', name: 'Jouet bébé interactif', image: '/file.svg', price: 5500, originalPrice: 11000, currency: 'FCFA', stockLeft: 45, badges: ['-50%'] },
  { id: 'f5', name: 'Palette maquillage 18 couleurs', image: '/file.svg', price: 5500, originalPrice: 11000, currency: 'FCFA', stockLeft: 19, badges: ['-50%'] },
  { id: 'f6', name: 'Sneakers running homme', image: '/file.svg', price: 7900, originalPrice: 15800, currency: 'FCFA', stockLeft: 6, badges: ['-50%'] },
  { id: 'f7', name: 'Montre connectée sport', image: '/file.svg', price: 9900, originalPrice: 19800, currency: 'FCFA', stockLeft: 15, badges: ['-50%'] },
  { id: 'f8', name: 'Sèche-cheveux ionique', image: '/file.svg', price: 5500, originalPrice: 11000, currency: 'FCFA', stockLeft: 31, badges: ['-50%'] },
]

export const flashSaleEndTime = new Date(Date.now() + 2 * 60 * 60 * 1000 + 34 * 60 * 1000 + 18 * 1000).toISOString() // 02:34:18 from now

// ─── Active Group Buys ───
export const activeGroupBuys: HomeGroupBuy[] = [
  { id: 'g1', productId: 'p1', name: 'Fer à repasser vapeur 2200W', image: '/file.svg', currentPrice: 6100, originalPrice: 11000, currency: 'FCFA', currentQty: 32, targetQty: 50, participants: 8, deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'g2', productId: 'p2', name: 'Set cosmétique 5 pièces', image: '/file.svg', currentPrice: 2500, originalPrice: 4500, currency: 'FCFA', currentQty: 18, targetQty: 30, participants: 5, deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'g3', productId: 'p3', name: 'Horloge LED digitale 3D', image: '/file.svg', currentPrice: 6000, originalPrice: 10000, currency: 'FCFA', currentQty: 45, targetQty: 50, participants: 12, deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'g4', productId: 'p4', name: 'GPS tracker véhicule', image: '/file.svg', currentPrice: 2455, originalPrice: 4455, currency: 'FCFA', currentQty: 27, targetQty: 40, participants: 6, deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
]

// ─── Popular Products (multi-category) ───
export const popularProducts: HomeProduct[] = [
  { id: 'p1', name: 'Robe d\'été femme fleurie', image: '/file.svg', price: 8500, currency: 'FCFA', rating: 4.7, soldCount: 120, deliveryDays: 3, origin: 'Import Chine' },
  { id: 'p2', name: 'Écouteurs sans fil TWS', image: '/file.svg', price: 12000, currency: 'FCFA', rating: 4.5, soldCount: 89, deliveryDays: 3, origin: 'Import Chine' },
  { id: 'p3', name: 'Sac à main cuir PU', image: '/file.svg', price: 15000, originalPrice: 22000, currency: 'FCFA', rating: 4.8, soldCount: 210, badges: ['-30%'], deliveryDays: 3, origin: 'Import Chine' },
  { id: 'p4', name: 'Smartwatch fitness tracker', image: '/file.svg', price: 22000, currency: 'FCFA', rating: 4.6, soldCount: 340, deliveryDays: 3, origin: 'Import Chine' },
  { id: 'p5', name: 'Set rouge à lèvres 3 tons', image: '/file.svg', price: 5500, currency: 'FCFA', rating: 4.3, soldCount: 67, deliveryDays: 3, origin: 'Import Chine' },
  { id: 'p6', name: 'Friteuse à air 5L digital', image: '/file.svg', price: 35000, originalPrice: 48000, currency: 'FCFA', rating: 4.9, soldCount: 56, badges: ['-27%'], deliveryDays: 3, origin: 'Import Chine' },
  { id: 'p7', name: 'Sneakers tendance unisexe', image: '/file.svg', price: 18000, currency: 'FCFA', rating: 4.5, soldCount: 198, deliveryDays: 3, origin: 'Import Chine' },
  { id: 'p8', name: 'Sac à dos enfant cartoon', image: '/file.svg', price: 7500, currency: 'FCFA', rating: 4.4, soldCount: 43, deliveryDays: 3, origin: 'Import Chine' },
  { id: 'p9', name: 'Sèche-cheveux ionique pro', image: '/file.svg', price: 14000, currency: 'FCFA', rating: 4.6, soldCount: 112, deliveryDays: 3, origin: 'Import Chine' },
  { id: 'p10', name: 'Support téléphone voiture', image: '/file.svg', price: 3500, currency: 'FCFA', rating: 4.2, soldCount: 256, deliveryDays: 3, origin: 'Import Chine' },
]

// ─── Showcase Categories ───
export const showcaseCategories: ShowcaseCategory[] = [
  { label: 'Mode & Vêtements', href: '/produits?cat=mode', image: '/file.svg', productCount: 2400, color: 'from-pink-500/60' },
  { label: 'Beauté & Cosmétiques', href: '/produits?cat=beaute', image: '/file.svg', productCount: 1800, color: 'from-violet-500/60' },
  { label: 'Maison & Déco', href: '/produits?cat=maison', image: '/file.svg', productCount: 1200, color: 'from-orange-500/60' },
  { label: 'Électronique', href: '/produits?cat=electronique', image: '/file.svg', productCount: 3500, color: 'from-blue-500/60' },
  { label: 'Auto & Moto', href: '/produits?cat=auto', image: '/file.svg', productCount: 900, color: 'from-slate-700/70' },
  { label: 'Sport & Outdoor', href: '/produits?cat=sport', image: '/file.svg', productCount: 1500, color: 'from-emerald-500/60' },
]

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
    image: p.image ?? '/file.svg',
    price: salePrice,
    originalPrice,
    currency: p.pricing?.currency ?? 'FCFA',
    rating: p.isFeatured ? 4.5 + Math.random() * 0.5 : 4.0 + Math.random() * 0.9,
    soldCount: Math.floor(Math.random() * 300) + 20,
    stockLeft: p.availability?.stockQuantity ?? Math.floor(Math.random() * 40) + 5,
    badges: badges.length > 0 ? badges : undefined,
    origin: p.isImported ? 'Import Chine' : 'Stock Dakar',
    deliveryDays: p.availability?.leadTimeDays ?? 3,
  }
}

export function mapCatalogToFlashProduct(p: CatalogApiProduct): HomeProduct {
  const mapped = mapCatalogToHomeProduct(p)
  // Force flash-style badge if there's a discount
  if (mapped.originalPrice && mapped.originalPrice > mapped.price) {
    const discount = Math.round(((mapped.originalPrice - mapped.price) / mapped.originalPrice) * 100)
    mapped.badges = [`-${discount}%`]
  } else {
    mapped.badges = ['-20%']
    mapped.originalPrice = Math.round(mapped.price * 1.25)
  }
  mapped.stockLeft = Math.floor(Math.random() * 30) + 3
  return mapped
}
