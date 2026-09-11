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
  stock: number;
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
  rating: number;
  reviews?: number;
  reviewCount?: number;
  images: string[];
  price: number;
  basePrice: number;
  base?: number;
  minOrderQty: number;
  moq?: number;
  priceTiers: PriceTier[];
  groupBuy?: ProductGroupBuy;
  variants: ProductVariant[];
  specs: [string, string][];
  shipping: ProductShipping;
  // Catalog / card shortcuts
  cat?: string;
  category?: string;
  img?: string;
  image?: string;
  save?: number;
  hasGroup?: boolean;
  verified?: boolean;
}

export interface Group {
  id: string;
  name: string;
  image: string;
  productId?: string;
  currentQty: number;
  targetQty: number;
  participants: number;
  deadline: string;
  deadlineAt?: number;
  unit: number;
  base: number;
  save: number;
  status: 'live' | 'almost' | string;
  category: string;
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
