import type {
  CartItem,
  Group,
  Order,
  Category,
  User,
  Product,
  ProductVariant,
  ShippingMode,
  OrderStatus,
  PriceTier,
} from './types';

export function fmtDeadline(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  const now = Date.now();
  const ms = d.getTime() - now;
  if (ms <= 0) return 'fermé';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}j ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function mapCatalogItem(p: any): Product {
  const price = p?.pricing?.salePrice ?? p?.price ?? 0;
  const base = p?.pricing?.baseCost ?? p?.baseCost ?? p?.price ?? 0;
  const moq =
    typeof p?.minOrderQty === 'number' && p.minOrderQty > 0 ? p.minOrderQty : 1;
  const save =
    p?.groupBuyDiscount ??
    (base > 0 && price > 0 ? Math.round(((base - price) / base) * 100) : 0);

  const activeGroup = p?.groupStats?.bestActiveGroup;
  const groupBuy = activeGroup
    ? {
        id: activeGroup.groupId || activeGroup.id,
        active: true,
        targetQty: activeGroup.targetQty ?? 0,
        currentQty: activeGroup.currentQty ?? 0,
        participants:
          typeof activeGroup.participantCount === 'number'
            ? activeGroup.participantCount
            : Array.isArray(activeGroup.participants)
              ? activeGroup.participants.length
              : 0,
        deadline: fmtDeadline(activeGroup.deadline),
        unitPrice: activeGroup.currentPrice ?? price,
        savePct:
          base > 0 && activeGroup.currentPrice
            ? Math.round(((base - activeGroup.currentPrice) / base) * 100)
            : 0,
      }
    : undefined;

  return {
    id: p?._id || p?.id || '',
    name: p?.name || 'Produit',
    brand: p?.sellerName || p?.category || 'DDM+',
    rating: p?.rating ?? 4.5,
    reviews: p?.reviewCount ?? 0,
    reviewCount: p?.reviewCount ?? 0,
    images: [p?.image || '/placeholder.svg'],
    price,
    basePrice: base,
    minOrderQty: moq,
    moq,
    priceTiers: (p?.priceTiers ?? []).map((t: any) => ({
      from: t.minQty ?? 1,
      to: null,
      unit: t.price ?? price,
      save: base > 0 && t.price ? Math.round(((base - t.price) / base) * 100) : 0,
    })),
    groupBuy,
    variants: [],
    specs: [],
    shipping: { origin: p?.sourcing?.origin || 'Guangzhou, Chine', modes: [] },
    cat: p?.category || 'Catalogue',
    category: p?.category,
    img: p?.image || '/placeholder.svg',
    image: p?.image,
    hasGroup: !!p?.groupBuyEnabled || !!activeGroup,
    verified: !!p?.sellerVerified,
    save,
  };
}

export function mapProductDetail(p: any, activeGroup?: any): Product {
  const pricing = p?.pricing || {};
  const price = pricing.salePrice ?? p?.price ?? 0;
  const base = pricing.baseCost ?? p?.baseCost ?? price;

  const rawTiers = (p?.priceTiers ?? []) as { minQty?: number; price?: number; discount?: number }[];
  const priceTiers: PriceTier[] = Array.isArray(rawTiers)
    ? rawTiers
        .slice()
        .sort((a, b) => (a.minQty ?? 1) - (b.minQty ?? 1))
        .map((t, i, arr) => ({
          from: t.minQty ?? 1,
          to: arr[i + 1] ? (arr[i + 1].minQty ?? 1) - 1 : null,
          unit: t.price ?? price,
          save:
            t.discount ??
            (base > 0 && t.price
              ? Math.round(((base - t.price) / base) * 100)
              : 0),
        }))
    : [];

  const groupBuyTarget =
    typeof p?.groupBuyTargetQty === 'number' && p.groupBuyTargetQty > 0
      ? p.groupBuyTargetQty
      : typeof p?.groupBuyMinQty === 'number' && p.groupBuyMinQty > 0
        ? p.groupBuyMinQty * 10
        : 100;

  const groupBest = activeGroup || (p?.groupStats?.bestActiveGroup as any);

  const groupBuy = p?.groupBuyEnabled
    ? {
        id: groupBest?.groupId || groupBest?.id,
        active: true,
        targetQty: groupBuyTarget,
        currentQty: groupBest?.currentQty ?? 0,
        participants:
          typeof groupBest?.participantCount === 'number'
            ? groupBest.participantCount
            : Array.isArray(groupBest?.participants)
              ? groupBest.participants.length
              : 0,
        deadline: fmtDeadline(groupBest?.deadline),
        unitPrice:
          p?.groupBuyBestPrice ?? groupBest?.currentPrice ?? price,
        savePct:
          p?.groupBuyDiscount ??
          (base > 0 && p?.groupBuyBestPrice
            ? Math.round(((base - p.groupBuyBestPrice) / base) * 100)
            : 0),
      }
    : undefined;

  const variants: ProductVariant[] = [];
  if (Array.isArray(p?.variantGroups)) {
    for (const g of p.variantGroups) {
      if (Array.isArray(g.variants)) {
        for (const v of g.variants) {
          variants.push({
            id: v.id || String(variants.length + 1),
            label: v.label || `${g.name}: ${v.value}`,
            stock:
              typeof v.stock === 'number' ? v.stock : typeof g.stock === 'number' ? g.stock : 100,
          });
        }
      }
    }
  }

  const specs: [string, string][] = [];
  if (Array.isArray(p?.features)) {
    for (const f of p.features) {
      if (typeof f === 'string') {
        const [label, ...rest] = f.split(':');
        specs.push([
          (label || f).trim(),
          rest.join(':').trim() || '—',
        ]);
      } else if (f && typeof f === 'object') {
        specs.push([
          f.label || f.name || 'Détail',
          f.value || f.description || '—',
        ]);
      }
    }
  }

  const modes: ShippingMode[] = [];
  const shippingOptions = pricing.shippingOptions || p?.shippingOptions;
  if (Array.isArray(shippingOptions)) {
    for (const opt of shippingOptions) {
      const key =
        opt.id ||
        (opt.durationDays && opt.durationDays <= 7 ? 'express' : opt.durationDays && opt.durationDays <= 15 ? 'aerien' : 'maritime');
      const label =
        key === 'express'
          ? 'Express aérien'
          : key === 'aerien'
            ? 'Standard aérien'
            : 'Maritime';
      const days =
        opt.durationDays && opt.durationDaysEnd
          ? `${opt.durationDays}-${opt.durationDaysEnd}j`
          : opt.durationDays
            ? `${opt.durationDays}j`
            : '—';
      const from = opt.cost ?? opt.price ?? 0;
      modes.push({ key, label, days, from });
    }
  }

  const minOrderQty =
    typeof p?.minOrderQty === 'number' && p.minOrderQty > 0
      ? p.minOrderQty
      : 1;

  return {
    id: p?._id || p?.id || '',
    name: p?.name || 'Produit',
    brand:
      p?.sellerName ||
      p?.category ||
      (p?.isImported ? 'Import direct' : 'DDM+'),
    description: p?.description || p?.tagline || '',
    rating: p?.rating ?? 4.5,
    reviews: p?.reviewCount ?? p?.reviews ?? 0,
    reviewCount: p?.reviewCount ?? p?.reviews ?? 0,
    images:
      Array.isArray(p?.gallery) && p.gallery.length > 0
        ? p.gallery
        : [p?.image || '/placeholder.svg'],
    price,
    basePrice: base,
    minOrderQty,
    moq: minOrderQty,
    priceTiers,
    groupBuy,
    variants: variants.length > 0 ? variants : [],
    specs: specs.length > 0 ? specs : [],
    shipping: {
      origin: p?.sourcing?.origin || 'Guangzhou, Chine',
      modes: modes.length > 0 ? modes : [
        { key: 'express', label: 'Express aérien', days: '4-7j', from: 3200 },
        { key: 'aerien', label: 'Standard aérien', days: '8-12j', from: 1800 },
        { key: 'maritime', label: 'Maritime', days: '35-45j', from: 850 },
      ],
    },
    cat: p?.category,
    category: p?.category,
    image: p?.image,
    img: p?.image,
  };
}

export function mapGroupOrder(g: any): Group {
  const currentQty = typeof g?.currentQty === 'number' ? g.currentQty : 0;
  const targetQty = typeof g?.targetQty === 'number' ? g.targetQty : 0;
  const unit =
    typeof g?.currentUnitPrice === 'number' ? g.currentUnitPrice : 0;
  const base =
    typeof g?.product?.basePrice === 'number'
      ? g.product.basePrice
      : typeof g?.base === 'number'
        ? g.base
        : 0;
  const pct = targetQty > 0 ? currentQty / targetQty : 0;
  const status: Group['status'] =
    g?.status === 'filled' || g?.status === 'almost' || pct >= 0.9
      ? 'almost'
      : 'live';

  const deadlineDate = g?.deadline ? new Date(g.deadline).getTime() : 0;

  return {
    id: g?.groupId || g?.id || '',
    name: g?.product?.name || 'Groupe',
    image: g?.product?.image || '/placeholder.svg',
    productId: g?.product?.productId || g?.product?._id || g?.product?.id,
    currentQty,
    targetQty,
    participants: Array.isArray(g?.participants)
      ? g.participants.length
      : g?.participantCount ?? 0,
    deadline: fmtDeadline(g?.deadline),
    deadlineAt: Number.isFinite(deadlineDate) ? deadlineDate : 0,
    unit,
    base,
    save:
      g?.savePct ??
      (base > 0 && unit > 0 ? Math.round(((base - unit) / base) * 100) : 0),
    status,
    category: g?.product?.category || 'Import',
  };
}

export function mapOrder(o: any): Order {
  const statusMap: Record<string, OrderStatus> = {
    pending: 'ordered',
    confirmed: 'ordered',
    ordered: 'ordered',
    processing: 'sourcing',
    shipped: 'in_transit',
    in_transit: 'in_transit',
    transit: 'in_transit',
    delivered: 'delivered',
    cancelled: 'cancelled',
    sourcing: 'sourcing',
    china: 'china',
  };

  const status = statusMap[o?.status as string] ?? 'ordered';
  const stepMap: Record<string, number> = {
    ordered: 1,
    sourcing: 2,
    china: 3,
    in_transit: 4,
    transit: 4,
    delivered: 5,
    cancelled: 5,
  };

  const items = Array.isArray(o?.items)
    ? o.items.map((it: any) => ({
        name: it.name || it.productName || 'Article',
        qty: it.qty ?? it.quantity ?? 1,
        unit: it.price ?? it.unitPrice ?? it.unit ?? 0,
        image: it.image || it.productImage || '/placeholder.svg',
      }))
    : [];

  const shippingStr =
    typeof o?.shipping === 'string'
      ? o.shipping
      : o?.shipping?.method ??
        o?.shipping?.label ??
        o?.shippingMethod ??
        o?.delivery?.carrier ??
        'Standard aérien';

  const eta =
    o?.delivery?.estimatedDeliveryDate || o?.delivery?.eta || o?.eta
      ? new Date(o?.delivery?.estimatedDeliveryDate || o?.delivery?.eta || o?.eta).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
        })
      : '—';

  return {
    id: o?.orderId || o?.id || 'CMD-0000',
    date: o?.createdAt
      ? new Date(o.createdAt).toISOString().split('T')[0]
      : '2026-09-09',
    status,
    items,
    total: o?.total ?? 0,
    shipping: shippingStr,
    tracking: o?.trackingNumber ?? o?.delivery?.trackingNumber ?? o?.tracking ?? '',
    eta,
    currentStep: stepMap[status] ?? 1,
  };
}

export function mapCategory(c: any): Category {
  const iconMap: Record<string, string> = {
    securite: 'shield',
    securité: 'shield',
    audio: 'message',
    eclairage: 'sparkles',
    auto: 'truck',
    mode: 'gift',
    maison: 'home',
    beaute: 'heart',
    beauté: 'heart',
    bureau: 'package',
  };
  const key =
    c?.slug ||
    c?.key ||
    c?.name
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') ||
    '';

  return {
    key,
    label: c?.labelFr || c?.label || c?.name || key,
    icon:
      c?.icon ||
      iconMap[key] ||
      'package',
    count: c?.count ?? c?.productCount ?? 0,
  };
}

export function mapUser(user: any, dashboard?: any): User {
  const fullName = user?.name || user?.username || 'Client';
  const firstName = fullName?.split(' ')[0] || fullName;
  const initials = fullName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
  const tier = dashboard?.user?.tier || user?.tier || 'Bronze';
  const thresholds: Record<string, number> = {
    Bronze: 500,
    Argent: 1000,
    Or: 2000,
    Platine: 10000,
  };
  const nextTierName: Record<string, string> = {
    Bronze: 'Argent',
    Argent: 'Or',
    Or: 'Platine',
    Platine: 'Platine',
  };
  const nextTier = nextTierName[tier] ?? 'Argent';
  const nextTierAt = thresholds[nextTier] ?? 10000;

  const mapProduct = (p: any) => ({
    id: String(p?._id ?? p?.id ?? ''),
    name: p?.name || 'Produit',
    image: p?.image || '/placeholder.svg',
    price: p?.price || 0,
    currency: p?.currency || 'FCFA',
    groupBuyEnabled: p?.groupBuyEnabled,
  });

  return {
    handle: firstName,
    initials,
    memberSince: user?.createdAt
      ? new Date(user.createdAt).getFullYear().toString()
      : '2026',
    grains: dashboard?.grains?.balance ?? user?.grainsBalance ?? 0,
    grainsTier: tier,
    nextTier,
    nextTierAt,
    stats: {
      orders: dashboard?.stats?.ordersCount ?? 0,
      groups: dashboard?.stats?.activeGroupBuys ?? 0,
      savings: dashboard?.stats?.totalSavings ?? 0,
    },
    activeOrder: 0,
    activities: Array.isArray(dashboard?.activities)
      ? dashboard.activities.map((a: any) => ({
          id: String(a?._id ?? a?.id ?? ''),
          type: a?.type || 'order',
          description: a?.description || '',
          amount: a?.amount,
          unit: a?.unit,
          createdAt: a?.createdAt,
        }))
      : [],
    recommendations: Array.isArray(dashboard?.recommendations)
      ? dashboard.recommendations.map(mapProduct)
      : [],
    favorites: Array.isArray(dashboard?.favoriteProducts)
      ? dashboard.favoriteProducts.map(mapProduct)
      : [],
  };
}

export function getTierForQty(qty: number, tiers: PriceTier[]) {
  const sorted = [...tiers].sort((a, b) => a.from - b.from);
  const tier = sorted.slice().reverse().find((t) => qty >= t.from) || sorted[0];
  const nextTier = sorted.find((t) => qty < t.from) || null;
  return {
    tierUnit: tier?.unit ?? 0,
    nextTier: nextTier
      ? { at: nextTier.from, save: nextTier.save }
      : null,
  };
}

export function mapCartItem(item: any): CartItem {
  const qty = item?.qty ?? item?.quantity ?? 1;
  const minOrderQty = Math.max(1, item?.minOrderQty ?? 1);
  const unit = item?.unit ?? item?.price ?? item?.unitPrice ?? 0;
  const priceTiers: PriceTier[] = Array.isArray(item?.priceTiers) ? item.priceTiers : [];
  const { tierUnit, nextTier } =
    priceTiers.length > 0
      ? getTierForQty(qty, priceTiers)
      : {
          tierUnit: item?.tierUnit ?? item?.salePrice ?? unit,
          nextTier: item?.nextTier || null,
        };
  const belowMOQ = qty < minOrderQty;

  return {
    id: item?.id || item?.variantId || item?.name || 'unknown',
    name: item?.name || 'Article',
    variant: item?.variant || item?.variantLabels?.join(' · '),
    variantId: item?.variantId || item?.variantIds?.[0],
    variantIds: item?.variantIds || (item?.variantId ? [item.variantId] : undefined),
    variantLabels: item?.variantLabels,
    image: item?.image || '/placeholder.svg',
    unit,
    qty,
    minOrderQty,
    priceTiers,
    tierUnit,
    nextTier,
    hasActiveGroup: !!item?.hasActiveGroup,
    groupUnit: item?.groupUnit,
    belowMOQ,
    moqDelta: belowMOQ ? minOrderQty - qty : 0,
  };
}

export function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('cart:items');
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cart:items', JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cart:updated'));
}

export function addToCart(item: CartItem) {
  const cart = loadCart();
  const idx = cart.findIndex((i) => i.id === item.id && i.variantId === item.variantId);
  if (idx >= 0) {
    cart[idx].qty += item.qty;
    if (cart[idx].priceTiers?.length) {
      const { tierUnit, nextTier } = getTierForQty(cart[idx].qty, cart[idx].priceTiers!);
      cart[idx].tierUnit = tierUnit;
      cart[idx].nextTier = nextTier;
    }
    cart[idx].belowMOQ = cart[idx].qty < cart[idx].minOrderQty;
    cart[idx].moqDelta = cart[idx].belowMOQ ? cart[idx].minOrderQty - cart[idx].qty : 0;
  } else {
    cart.push(item);
  }
  saveCart(cart);
}
