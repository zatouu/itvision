export type OrderStatus =
  | 'ordered'
  | 'sourcing'
  | 'china'
  | 'in_transit'
  | 'transit'
  | 'delivered'
  | 'cancelled';

export interface OrderStep {
  key: string;
  label: string;
  desc: string;
}

export interface OrderItem {
  name: string;
  qty: number;
  unit: number;
  image: string;
  /** Libellés des variantes choisies (ex. « Couleur: Rouge ») — dérivés serveur */
  variantLabels?: string[];
}

export interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  shipping: string;
  tracking: string;
  eta: string;
  currentStep: number;
  /** Statut paiement serveur ('pending' | 'completed' | 'paid' | …) */
  paymentStatus?: string;
}

export interface PriceTier {
  from: number;
  to: number | null;
  unit: number;
  save: number;
}

export interface ShippingMode {
  key: string;
  label: string;
  days: string;
  from: number;
}

export interface ProductVariant {
  id: string;
  label: string;
  /** Stock réel de la variante. undefined = non suivi (non contraint côté serveur) */
  stock?: number;
  /** Prix unitaire client tout compris de la variante. undefined = prix produit */
  price?: number;
  image?: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductGroupBuy {
  id?: string;
  active: boolean;
  targetQty: number;
  currentQty: number;
  participants?: number;
  deadline: string;
  unitPrice: number;
  savePct: number;
}

export interface ProductShipping {
  origin: string;
  modes: ShippingMode[];
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  /** Note moyenne réelle. 0 = aucun avis, ne pas afficher d'étoiles */
  rating: number;
  reviews?: number;
  reviewCount?: number;
  images: string[];
  /** Prix unitaire tout compris (marchandise + frais de service + assurance), hors transport */
  price: number;
  /** Meilleure référence réellement inférieure (palier/groupe). 0 = aucune, pas de prix barré */
  basePrice: number;
  base?: number;
  minOrderQty: number;
  moq?: number;
  priceTiers: PriceTier[];
  groupBuy?: ProductGroupBuy;
  variants: ProductVariant[];
  specs: [string, string][];
  descriptionImages?: string[];
  shipping: ProductShipping;
  // Catalog / card shortcuts
  cat?: string;
  category?: string;
  img?: string;
  image?: string;
  save?: number;
  hasGroup?: boolean;
  verified?: boolean;
  createdAt?: string;
  /** 'in_stock' | 'preorder' | 'out_of_stock' — pilote le badge de disponibilité */
  availabilityStatus?: string;
  /** true si le produit a des groupes de variantes (sélection obligatoire avant panier) */
  hasVariants?: boolean;
  /** Libellé des frais inclus dans `price` (ex. « frais de service 10% + assurance 2,5% ») */
  includedFees?: string;
}

export interface Group {
  id: string;
  name: string;
  image: string;
  productId?: string;
  currentQty: number;
  targetQty: number;
  participants: number;
  participantList?: { name: string; qty: number; variantLabels?: string[]; joinedAt?: string }[];
  deadline: string;
  deadlineAt?: number;
  unit: number;
  base: number;
  save: number;
  status: 'live' | 'almost' | string;
  /** Paliers de prix réels du groupe (minQty → prix unitaire) */
  priceTiers?: { minQty: number; price: number }[];
  category: string;
  createdAt?: number;
  /** Groupes de variantes du produit (sélection requise au join si non vide) */
  variantGroups?: { name: string; variants: { id: string; name: string; price?: number; stock?: number; image?: string }[] }[];
  requiresVariant?: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  variant?: string;
  variantId?: string;
  variantIds?: string[];
  variantLabels?: string[];
  image: string;
  unit: number;
  qty: number;
  minOrderQty: number;
  priceTiers?: PriceTier[];
  tierUnit: number;
  nextTier: { at: number; save: number } | null;
  hasActiveGroup: boolean;
  groupUnit?: number;
  groupId?: string;
  belowMOQ?: boolean;
  moqDelta?: number;
}

export interface Category {
  key: string;
  label: string;
  icon: string;
  count: number;
}

export interface Testimonial {
  initials: string;
  handle: string;
  role: string;
  quote: string;
  rating: number;
}

export interface Participant {
  initials: string;
  handle: string;
  when: string;
}

export interface UserStats {
  orders: number;
  groups: number;
  savings: number;
}

export interface UserActivity {
  id: string;
  type: string;
  description: string;
  amount?: number;
  unit?: string;
  createdAt: string;
}

export interface UserRecommendation {
  id: string;
  name: string;
  image?: string;
  price: number;
  currency: string;
  groupBuyEnabled?: boolean;
}

export interface User {
  handle: string;
  initials?: string;
  memberSince: string;
  grains: number;
  grainsTier: string;
  nextTier?: string;
  nextTierAt: number;
  stats: UserStats;
  activeOrder: number;
  activities?: UserActivity[];
  recommendations?: UserRecommendation[];
  favorites?: UserRecommendation[];
}
