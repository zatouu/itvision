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
import { filterSpecEntries } from '@/lib/catalog/description-format';
import { resolveDisplayPrice, toAllIn, describeIncludedFees } from '@/lib/pricing/display-price';
import { ICON_NAMES } from './Icon';

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
  // Prix affiché = tout compris (marchandise + frais de service + assurance),
  // aligné sur le devis serveur. Le transport reste hors prix unitaire.
  const price = resolveDisplayPrice(p?.pricing, p?.price);
  const moq =
    typeof p?.minOrderQty === 'number' && p.minOrderQty > 0 ? p.minOrderQty : 1;

  // Meilleure référence réellement moins chère (palier quantité ou prix groupe),
  // portée au niveau tout compris. Aucune remise inventée : sans référence
  // inférieure, pas de prix barré ni de badge.
  const tierPrices = Array.isArray(p?.priceTiers)
    ? p.priceTiers
        .map((t: any) => (typeof t?.price === 'number' && t.price > 0 ? t.price : null))
        .filter((v: number | null): v is number => v !== null)
    : [];
  const bestTierAllIn = tierPrices.length > 0
    ? toAllIn(Math.min(...tierPrices), p?.pricing)
    : 0;
  const bestGroupAllIn = typeof p?.groupBuyBestPrice === 'number' && p.groupBuyBestPrice > 0
    ? toAllIn(p.groupBuyBestPrice, p?.pricing)
    : 0;
  const bestAllIn = [bestTierAllIn, bestGroupAllIn].filter((v) => v > 0 && v < price).sort((a, b) => a - b)[0] ?? 0;
  const save = bestAllIn > 0 && price > 0 ? Math.round(((price - bestAllIn) / price) * 100) : 0;

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
        unitPrice: toAllIn(activeGroup.currentPrice, p?.pricing) || price,
        savePct:
          price > 0 && toAllIn(activeGroup.currentPrice, p?.pricing) > 0
            ? Math.max(0, Math.round(((price - toAllIn(activeGroup.currentPrice, p?.pricing)) / price) * 100))
            : 0,
      }
    : undefined;

  return {
    id: p?._id || p?.id || '',
    name: p?.name || 'Produit',
    brand: p?.sellerName || p?.category || 'DDM+',
    // Aucune note par défaut : sans avis, la carte n'affiche pas d'étoiles.
    rating: typeof p?.rating === 'number' && p.rating > 0 ? p.rating : 0,
    reviews: p?.reviewCount ?? 0,
    reviewCount: p?.reviewCount ?? 0,
    images: [p?.image || '/placeholder.svg'],
    price,
    // Prix barré = meilleure référence réellement inférieure, 0 sinon.
    basePrice: bestAllIn,
    minOrderQty: moq,
    moq,
    priceTiers: (p?.priceTiers ?? []).map((t: any) => {
      const unit = toAllIn(t.price, p?.pricing) || price;
      return {
        from: t.minQty ?? 1,
        to: null,
        unit,
        save: price > 0 && unit > 0 && unit < price ? Math.round(((price - unit) / price) * 100) : 0,
      };
    }),
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
    createdAt: p?.createdAt,
    availabilityStatus: p?.availability?.status,
    hasVariants: !!p?.hasVariants,
    includedFees: describeIncludedFees(p?.pricing) ?? undefined,
  };
}

export function mapProductDetail(p: any, activeGroup?: any): Product {
  const pricing = p?.pricing || {};
  // Prix tout compris (marchandise + frais de service + assurance), hors transport.
  const price = resolveDisplayPrice(pricing, p?.price);

  const rawTiers = (p?.priceTiers ?? []) as { minQty?: number; price?: number; discount?: number }[];
  const priceTiers: PriceTier[] = Array.isArray(rawTiers)
    ? rawTiers
        .slice()
        .sort((a, b) => (a.minQty ?? 1) - (b.minQty ?? 1))
        .map((t, i, arr) => {
          const unit = toAllIn(t.price, pricing) || price;
          return {
            from: t.minQty ?? 1,
            to: arr[i + 1] ? (arr[i + 1].minQty ?? 1) - 1 : null,
            unit,
            // Économie mesurée contre le prix unitaire affiché, jamais contre le
            // coût sourcing (qui est structurellement inférieur au prix de vente).
            save: price > 0 && unit > 0 && unit < price
              ? Math.round(((price - unit) / price) * 100)
              : 0,
          };
        })
    : [];

  // Objectif du groupe : valeur configurée uniquement. Pas d'objectif inventé
  // (l'ancien fallback `minQty × 10` / `100` affichait une barre de progression
  // mesurée contre une cible qui n'existait pas).
  const groupBuyTarget =
    typeof p?.groupBuyTargetQty === 'number' && p.groupBuyTargetQty > 0
      ? p.groupBuyTargetQty
      : typeof p?.groupBuyMinQty === 'number' && p.groupBuyMinQty > 0
        ? p.groupBuyMinQty
        : 0;

  const groupBest = activeGroup || (p?.groupStats?.bestActiveGroup as any);

  const groupUnitAllIn = toAllIn(
    p?.groupBuyBestPrice ?? groupBest?.currentPrice ?? groupBest?.currentUnitPrice,
    pricing
  );

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
        unitPrice: groupUnitAllIn || price,
        savePct:
          price > 0 && groupUnitAllIn > 0 && groupUnitAllIn < price
            ? Math.round(((price - groupUnitAllIn) / price) * 100)
            : 0,
      }
    : undefined;

  const variants: ProductVariant[] = [];
  if (Array.isArray(p?.variantGroups)) {
    for (const g of p.variantGroups) {
      if (Array.isArray(g.variants)) {
        for (const v of g.variants) {
          variants.push({
            id: v.id || String(variants.length + 1),
            label: v.label || v.name || `${g.name}: ${v.value}`,
            // Stock réel uniquement — les variantes legacy sans stock ne sont pas
            // contraintes côté serveur, afficher « 100 en stock » était faux.
            stock:
              typeof v.stock === 'number' ? v.stock : typeof g.stock === 'number' ? g.stock : undefined,
            // Le prix variante est exprimé au niveau salePrice → tout compris.
            price: typeof v.price === 'number' && v.price > 0 ? toAllIn(v.price, pricing) : undefined,
            image: typeof v.image === 'string' && v.image ? v.image : undefined,
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
    // Aucune note par défaut : sans avis réel, pas d'étoiles.
    rating: typeof p?.rating === 'number' && p.rating > 0 ? p.rating : 0,
    reviews: p?.reviewCount ?? p?.reviews ?? 0,
    reviewCount: p?.reviewCount ?? p?.reviews ?? 0,
    images:
      Array.isArray(p?.gallery) && p.gallery.length > 0
        ? p.gallery
        : [p?.image || '/placeholder.svg'],
    price,
    // Référence barrée = meilleur palier réellement inférieur, sinon aucune.
    basePrice: priceTiers.reduce(
      (best, t) => (t.unit > 0 && t.unit < price && (best === 0 || t.unit < best) ? t.unit : best),
      0
    ),
    minOrderQty,
    moq: minOrderQty,
    priceTiers,
    groupBuy,
    variants: variants.length > 0 ? variants : [],
    specs: specs.length > 0 ? filterSpecEntries(specs) : [],
    descriptionImages: Array.isArray(p?.descriptionImages)
      ? p.descriptionImages.filter((u: any) => typeof u === 'string' && u.startsWith('http'))
      : [],
    shipping: {
      origin: p?.sourcing?.origin || 'Guangzhou, Chine',
      // Pas de modes fictifs : si le produit n'a pas d'options calculées
      // (produit en stock local, par ex.), la section n'a rien à annoncer.
      modes,
    },
    cat: p?.category,
    category: p?.category,
    image: p?.image,
    img: p?.image,
    availabilityStatus: p?.availability?.status,
    hasVariants: Array.isArray(p?.variantGroups) && p.variantGroups.length > 0,
    includedFees: describeIncludedFees(pricing) ?? undefined,
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
  // Conserve les états fermés : un groupe 'filled'/'ordered'/'cancelled' ne doit
  // plus présenter de CTA « Rejoindre » (l'API rejetterait l'inscription).
  const status: Group['status'] =
    g?.status === 'filled'
      ? 'filled'
      : g?.status === 'ordering' || g?.status === 'ordered'
        ? 'ordered'
        : g?.status === 'shipped' || g?.status === 'delivered' || g?.status === 'cancelled' || g?.status === 'draft'
          ? g.status
          : g?.status === 'almost' || pct >= 0.9
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
    participantList: Array.isArray(g?.participants)
      ? g.participants.map((p: any) => ({
          name: String(p?.name || 'Participant'),
          qty: Number(p?.qty) || 0,
          variantLabels: Array.isArray(p?.variantLabels) ? p.variantLabels : undefined,
          joinedAt: p?.joinedAt ? String(p.joinedAt) : undefined,
        }))
      : [],
    deadline: fmtDeadline(g?.deadline),
    deadlineAt: Number.isFinite(deadlineDate) ? deadlineDate : 0,
    unit,
    base,
    save:
      g?.savePct ??
      (base > 0 && unit > 0 ? Math.round(((base - unit) / base) * 100) : 0),
    status,
    category: g?.product?.category || 'Import',
    createdAt: g?.createdAt ? new Date(g.createdAt).getTime() : undefined,
    variantGroups: Array.isArray(g?.variantGroups) ? g.variantGroups : undefined,
    requiresVariant: !!g?.requiresVariant,
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
        variantLabels: Array.isArray(it.variantLabels) && it.variantLabels.length > 0
          ? it.variantLabels
          : (typeof it.variant === 'string' && it.variant ? [it.variant] : undefined),
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
    id: o?.orderId || o?.id || '',
    date: o?.createdAt
      ? new Date(o.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    status,
    items,
    total: o?.total ?? 0,
    shipping: shippingStr,
    tracking: o?.trackingNumber ?? o?.delivery?.trackingNumber ?? o?.tracking ?? '',
    eta,
    currentStep: stepMap[status] ?? 1,
    paymentStatus: o?.paymentStatus,
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
    informatique: 'monitor',
    domotique: 'home',
    electronique: 'smartphone',
    mobilier: 'package',
    'packs-cadeaux': 'gift',
  };
  // L'API renvoie des emojis (🛡️) — non résolubles en icône Lucide → mapping par clé.
  const isEmoji = (v?: string) => !!v && /[^a-zA-Z0-9_-]/.test(v);
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
      (c?.icon && !isEmoji(c.icon) && ICON_NAMES.has(c.icon) ? c.icon : undefined) ||
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
  const grainsBalance = dashboard?.grains?.balance ?? user?.grainsBalance ?? 0;
  const tier = dashboard?.grains?.tier || dashboard?.user?.tier || user?.tier || 'Bronze';
  // Seuils serveur prioritaires (source : GRAIN_TIERS dans lib/grains)
  const TIER_MIN: Record<string, number> = { Bronze: 0, Argent: 500, Or: 2000, Platine: 5000 };
  const nextTier = dashboard?.grains?.nextTier
    ?? (tier === 'Bronze' ? 'Argent' : tier === 'Argent' ? 'Or' : 'Platine');
  const nextTierAt = dashboard?.grains?.grainsToNextTier != null
    ? grainsBalance + dashboard.grains.grainsToNextTier
    : (TIER_MIN[nextTier] ?? 5000);

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
      : '',
    grains: grainsBalance,
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
    groupId: item?.groupId,
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

/**
 * Ajout rapide depuis une carte produit (catalogue, accueil, boutique).
 *
 * Réservé aux produits sans groupe de variantes : le devis serveur exige une
 * sélection par groupe de variantes, un ajout « à l'aveugle » serait rejeté.
 * La quantité part du lot minimum pour ne pas créer de ligne sous-MOQ.
 */
export function quickAddToCart(product: Product): boolean {
  if (product.hasVariants) return false;
  const minOrderQty = Math.max(1, product.minOrderQty ?? product.moq ?? 1);
  const priceTiers = product.priceTiers ?? [];
  const { tierUnit, nextTier } =
    priceTiers.length > 0
      ? getTierForQty(minOrderQty, priceTiers)
      : { tierUnit: product.price, nextTier: null };

  addToCart({
    id: product.id,
    name: product.name,
    image: product.img || product.image || product.images?.[0] || '/placeholder.svg',
    unit: product.price,
    qty: minOrderQty,
    minOrderQty,
    priceTiers,
    tierUnit: tierUnit || product.price,
    nextTier,
    hasActiveGroup: !!product.groupBuy?.active,
    groupUnit: product.groupBuy?.unitPrice,
    groupId: product.groupBuy?.id,
    belowMOQ: false,
    moqDelta: 0,
  });
  return true;
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
