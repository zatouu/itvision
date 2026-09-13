/**
 * Source unique de vérité pour la tarification d'un panier marketplace.
 *
 * Formule métier (validée produit) :
 *   total = prix sourcing (coût fournisseur FCFA)
 *         + frais de service (paliers dégressifs)
 *         + assurance
 *         − remise quantité
 *         − remise promo / grains
 *         + transport (poids facturable réel/volumétrique, minimum de facturation)
 *
 * Fallback : si aucun coût sourcing n'est disponible (produit local en stock),
 * le prix retail DB est utilisé comme base et les frais de service/assurance
 * ne s'appliquent pas.
 *
 * Utilisé par : POST /api/order (facturation) et POST /api/pricing/quote (affichage).
 * Le client n'envoie que { id, qty, variantIds } — jamais de prix.
 */

import mongoose from 'mongoose'
import Product from '@/lib/models/Product'
import PromoCode from '@/lib/models/PromoCode'
import { connectDB } from '@/lib/db'
import { calculateCartTotal, type CartItem, type CompleteCartCalculation } from './cart-calculator'
import { DEFAULT_EXCHANGE_RATE, getCNYToXOFRate } from './exchange-rate'
import { resolveProductPrice, type MarketplaceTier } from './resolve-product-price'
import { readPricingDefaults } from './settings'
import { getConfiguredShippingRates, readSeaFreightEligibilitySettings } from '@/lib/shipping/settings'
import { buildSeaFreightMetrics, evaluateSeaFreightEligibility } from '@/lib/shipping/sea-freight-eligibility'
import { checkStockAvailability } from '@/lib/inventory'
import { productHasVariantGroups } from './variants'
import type { ShippingMethodId, ShippingRate } from '@/lib/logistics'

// ─── Méthodes de livraison ────────────────────────────────────────────────────

/** Ids envoyés par le frontend → ids internes de tarification */
export const SHIPPING_METHOD_MAP: Record<string, ShippingMethodId> = {
  express_3j: 'air_express',
  air_15j: 'air_15',
  maritime_60j: 'sea_freight',
}

export function resolveShippingMethod(method?: string): {
  clientMethod: string
  internalMethod: ShippingMethodId
  rate: ShippingRate
} | { error: string } {
  const clientMethod = method || 'air_15j'
  const internalMethod =
    SHIPPING_METHOD_MAP[clientMethod] ||
    (['air_express', 'air_15', 'sea_freight'].includes(clientMethod) ? (clientMethod as ShippingMethodId) : null)
  if (!internalMethod) return { error: `Méthode de livraison inconnue: ${clientMethod}` }
  const rate = getConfiguredShippingRates()[internalMethod]
  if (!rate) return { error: 'Méthode de livraison invalide' }
  return { clientMethod, internalMethod, rate }
}

// ─── Chargement produits ──────────────────────────────────────────────────────

export interface QuoteCartItemInput {
  id: string
  qty?: number
  name?: string
  variantId?: string
  variantIds?: string[]
}

/** Ids de variantes demandés par le client (fusion variantId + variantIds, dédupliqué). */
export function itemVariantIds(item: { variantId?: string; variantIds?: string[] }): string[] {
  const ids = Array.isArray(item.variantIds) ? item.variantIds : []
  const merged = item.variantId ? [item.variantId, ...ids] : ids
  return [...new Set(merged.filter((v): v is string => typeof v === 'string' && v.trim().length > 0))]
}

// ─── Résolution des variantes ─────────────────────────────────────────────────

export interface ResolvedVariant {
  id: string
  name: string
  groupName: string
  /** Coût sourcing spécifique en FCFA (priceFCFA, sinon price1688 × taux). null = prix produit */
  sourcingBaseFcfa: number | null
  stock: number | null
}

export { productHasVariantGroups, productHasPricedVariants } from './variants'

/**
 * Résout les variantIds demandés contre les variantGroups du produit DB.
 * Retourne les variantes trouvées + les ids inconnus (à rejeter côté appelant).
 */
export function resolveItemVariants(
  db: any,
  variantIds: string[] | undefined,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): { variants: ResolvedVariant[]; missing: string[] } {
  const requested = Array.isArray(variantIds) ? variantIds.filter(Boolean) : []
  const groups = Array.isArray(db?.variantGroups) ? db.variantGroups : []
  const all: { v: any; groupName: any }[] = groups.flatMap((g: any) =>
    (Array.isArray(g?.variants) ? g.variants : []).map((v: any) => ({ v, groupName: g?.name }))
  )
  const variants: ResolvedVariant[] = []
  const missing: string[] = []
  for (const id of requested) {
    const hit = all.find(({ v }) => v?.id === id)
    if (!hit) {
      missing.push(id)
      continue
    }
    const { v, groupName } = hit
    const sourcingBaseFcfa =
      typeof v.priceFCFA === 'number' && v.priceFCFA > 0
        ? v.priceFCFA
        : typeof v.price1688 === 'number' && v.price1688 > 0
          ? v.price1688 * (db?.exchangeRate || exchangeRate)
          : null
    variants.push({
      id,
      name: v.name || 'Variante',
      groupName: groupName || 'Option',
      sourcingBaseFcfa,
      stock: typeof v.stock === 'number' ? v.stock : null,
    })
  }
  return { variants, missing }
}

export interface EffectiveItemPricing {
  /** Prix unitaire affiché (coût sourcing × (1 + marge)) — variante si elle a son prix */
  displayPrice: number
  baseCostFcfa?: number
  price1688?: number
  b2bPrice?: number
  priceTiers?: { minQty?: number; maxQty?: number; price?: number; discount?: number }[]
  /** Libellés « Groupe: Variante » dérivés du serveur (jamais du client) */
  variantLabels?: string[]
  hasVariantPricing: boolean
}

/**
 * Prix effectif d'un item : si une variante sélectionnée porte son propre coût
 * sourcing (priceFCFA / price1688), elle devient la base de calcul. Avec
 * plusieurs variantes chiffrées, le coût le plus élevé s'applique — le modèle
 * ne représente pas les combinaisons, on ne sous-facture jamais.
 *
 * Les paliers quantité et le prix wholesale étant définis en absolu sur le prix
 * de base, ils sont mis à l'échelle du prix variante (même ratio de remise) —
 * sinon un palier « base » plafonnerait une variante plus chère.
 */
export function computeEffectivePricing(
  db: any,
  variantIds: string[] | undefined,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): EffectiveItemPricing {
  const marginRate = typeof db?.marginRate === 'number' && db.marginRate > 0 ? db.marginRate : 0
  const productSourcing =
    typeof db?.baseCost === 'number' && db.baseCost > 0
      ? db.baseCost
      : db?.price1688 && db.price1688 > 0
        ? db.price1688 * (db.exchangeRate || exchangeRate)
        : 0
  const productDisplay =
    productSourcing > 0 ? Math.round(productSourcing * (1 + marginRate / 100)) : (db?.price ?? 0)

  const { variants } = resolveItemVariants(db, variantIds, exchangeRate)
  const variantLabels = variants.length > 0
    ? variants.map((v) => `${v.groupName}: ${v.name}`)
    : undefined
  const priced = variants
    .map((v) => v.sourcingBaseFcfa)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const variantSourcing = priced.length > 0 ? Math.max(...priced) : null

  if (variantSourcing === null) {
    return {
      displayPrice: productDisplay,
      baseCostFcfa: db?.baseCost,
      price1688: db?.price1688,
      b2bPrice: db?.b2bPrice,
      priceTiers: db?.priceTiers,
      variantLabels,
      hasVariantPricing: false,
    }
  }

  const variantDisplay = Math.round(variantSourcing * (1 + marginRate / 100))
  const scale = productDisplay > 0 ? variantDisplay / productDisplay : 1
  const b2bPrice =
    typeof db?.b2bPrice === 'number' && db.b2bPrice > 0
      ? Math.round(db.b2bPrice * scale)
      : undefined
  const priceTiers = Array.isArray(db?.priceTiers)
    ? db.priceTiers.map((t: any) => ({
        ...t,
        price: typeof t?.price === 'number' ? Math.round(t.price * scale) : t?.price,
      }))
    : undefined

  return {
    displayPrice: variantDisplay,
    baseCostFcfa: variantSourcing,
    b2bPrice,
    priceTiers,
    variantLabels,
    hasVariantPricing: true,
  }
}

/**
 * Les ids panier sont composites : productId[-variantKey][-shippingId]
 * Ex: "69b2dafecd40b2d770a0a398-v1+v2-air_express"
 */
export function extractProductObjectId(itemId: string): string | null {
  if (!itemId) return null
  for (const part of itemId.split('-')) {
    if (mongoose.Types.ObjectId.isValid(part)) return part
  }
  return null
}

export interface CartProductsContext {
  /** rawId panier → ObjectId produit */
  itemProductIdMap: Map<string, string>
  /** ObjectId produit → document DB */
  dbProductMap: Map<string, any>
}

const PRODUCT_SELECT =
  '_id name category price b2bPrice price1688 exchangeRate serviceFeeRate insuranceRate ' +
  'weightKg lengthCm widthCm heightCm volumeM3 grossWeightKg netWeightKg ' +
  'stockStatus stockQuantity baseCost marginRate requiresQuote ' +
  'variantGroups priceTiers'

/**
 * Charge les produits du panier depuis MongoDB et valide leur disponibilité.
 * Avec checkStock, vérifie aussi le stock global et par variante.
 */
export async function loadCartProducts(
  cart: QuoteCartItemInput[],
  opts: { checkStock?: boolean } = {}
): Promise<{ ok: true; ctx: CartProductsContext } | { ok: false; error: string }> {
  await connectDB()

  const itemProductIdMap = new Map<string, string>()
  const cartProductIds = cart
    .map((item) => {
      const rawId = String(item.id || '')
      const productId = extractProductObjectId(rawId)
      if (productId) itemProductIdMap.set(rawId, productId)
      return productId
    })
    .filter((id): id is string => Boolean(id))

  const dbProductMap = new Map<string, any>()
  if (cartProductIds.length > 0) {
    const dbProducts = await Product.find({
      _id: { $in: cartProductIds },
      isPublished: { $ne: false },
    }).select(PRODUCT_SELECT).lean()
    for (const p of dbProducts as any[]) dbProductMap.set(String(p._id), p)
  }

  for (const item of cart) {
    const rawId = String(item.id || '')
    const productId = itemProductIdMap.get(rawId)
    const dbProduct = productId ? dbProductMap.get(productId) : null
    if (!productId) {
      return { ok: false, error: `Identifiant produit invalide: ${item.name || item.id}` }
    }
    if (!dbProduct) {
      return { ok: false, error: `Produit introuvable ou non disponible: ${item.name || item.id}` }
    }

    // Variantes : fail-closed. Un produit avec groupes de variantes exige une
    // sélection valide ; tout id inconnu est rejeté (sinon la commande
    // enregistrerait une variante fantôme au prix de base).
    const requestedVariantIds = itemVariantIds(item)
    const { variants: resolvedVariants, missing } = resolveItemVariants(dbProduct, requestedVariantIds)
    if (missing.length > 0) {
      return { ok: false, error: `${dbProduct.name}: variante sélectionnée invalide` }
    }
    if (productHasVariantGroups(dbProduct) && resolvedVariants.length === 0) {
      return { ok: false, error: `${dbProduct.name}: veuillez sélectionner une variante` }
    }

    if (opts.checkStock) {
      const stockCheck = await checkStockAvailability(productId, item.qty || 1, requestedVariantIds)
      if (!stockCheck.ok) {
        return { ok: false, error: `${stockCheck.productName || dbProduct.name}: ${stockCheck.reason}` }
      }
    }
  }

  return { ok: true, ctx: { itemProductIdMap, dbProductMap } }
}

/**
 * Construit les items du calculateur — prix et dimensions issus de la DB,
 * jamais du client.
 */
export function buildCalculatorItems(
  cart: QuoteCartItemInput[],
  ctx: CartProductsContext,
  marketplaceTier: MarketplaceTier = 'standard',
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): CartItem[] {
  return cart.map((item) => {
    const rawId = String(item.id || '')
    const productId = ctx.itemProductIdMap.get(rawId)
    const db = productId ? ctx.dbProductMap.get(productId) : null
    // Prix effectif : variante si elle porte son propre coût, sinon produit.
    const eff = computeEffectivePricing(db, itemVariantIds(item), exchangeRate)
    return {
      id: productId || rawId,
      name: db?.name || item.name || 'Produit',
      price: eff.displayPrice,
      b2bPrice: eff.b2bPrice,
      baseCostFcfa: eff.baseCostFcfa,
      marginRate: db?.marginRate,
      price1688: eff.price1688,
      priceTiers: eff.priceTiers,
      exchangeRate: db?.exchangeRate,
      serviceFeeRate: db?.serviceFeeRate,
      insuranceRate: db?.insuranceRate,
      qty: item.qty || 1,
      weightKg: db?.weightKg ?? db?.grossWeightKg ?? db?.netWeightKg,
      lengthCm: db?.lengthCm,
      widthCm: db?.widthCm,
      heightCm: db?.heightCm,
      volumeM3: db?.volumeM3,
      marketplaceTier,
    }
  })
}

/** Prix unitaire appliqué (retail/wholesale) tel que stocké dans la commande. */
export function resolveItemUnitPrice(
  db: any,
  qty: number,
  marketplaceTier: MarketplaceTier,
  totalCartQty: number,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE,
  variantIds?: string[]
): { appliedPrice: number; priceType: 'retail' | 'wholesale' } {
  const eff = computeEffectivePricing(db, variantIds, exchangeRate)
  return resolveProductPrice({
    price: eff.displayPrice,
    b2bPrice: eff.b2bPrice,
    qty,
    marketplaceTier,
    totalCartQty,
    priceTiers: eff.priceTiers,
  })
}

// ─── Promo ────────────────────────────────────────────────────────────────────

export interface PromoValidation {
  valid: boolean
  code: string
  discount: number
  reason?: string
}

export async function validatePromoCode(code: string, subtotal: number, grainsDiscount = 0): Promise<PromoValidation> {
  const normalized = code.trim().toUpperCase()
  const promoDoc = await PromoCode.findOne({ code: normalized, active: true })
  const now = new Date()

  if (!promoDoc) return { valid: false, code: normalized, discount: 0, reason: 'Code promo invalide' }
  if (promoDoc.validFrom && promoDoc.validFrom > now) return { valid: false, code: normalized, discount: 0, reason: 'Code pas encore actif' }
  if (promoDoc.validUntil && promoDoc.validUntil < now) return { valid: false, code: normalized, discount: 0, reason: 'Code expiré' }
  if ((promoDoc.usedCount || 0) >= (promoDoc.maxUses || Infinity)) return { valid: false, code: normalized, discount: 0, reason: 'Code épuisé' }
  if (subtotal < (promoDoc.minOrderAmount || 0)) {
    return { valid: false, code: normalized, discount: 0, reason: `Montant minimum: ${promoDoc.minOrderAmount} FCFA` }
  }

  let discount = promoDoc.discountPercent
    ? Math.round(subtotal * (promoDoc.discountPercent / 100))
    : (promoDoc.discountAmount || 0)
  if (promoDoc.maxDiscountAmount) discount = Math.min(discount, promoDoc.maxDiscountAmount)
  discount = Math.min(discount, subtotal - grainsDiscount)

  return { valid: true, code: normalized, discount: Math.max(0, discount) }
}

// ─── Devis complet ────────────────────────────────────────────────────────────

export interface CartQuote {
  currency: 'FCFA'
  items: {
    id: string
    productId: string
    name: string
    qty: number
    unitPrice: number
    priceType: 'retail' | 'wholesale'
    variantIds?: string[]
    variantLabels?: string[]
  }[]
  /** Décomposition métier : sourcing + frais de service + assurance */
  pricing: {
    sourcingCost: number
    usingRetailPricing: boolean
    serviceFee: { rate: number; amount: number; standardRate: number; savings: number }
    insurance: { rate: number; amount: number }
    quantityDiscount: { percent: number; amount: number; label: string } | null
    subtotal: number
  }
  shipping: {
    method: string
    methodId: ShippingMethodId
    label: string
    cost: number
    billedWeight: number
    billingMethod: 'actual' | 'volumetric'
    minimumCharge?: number
  } | null
  /** Coût réel par méthode (pour afficher les 3 cartes de livraison) */
  shippingOptions?: {
    methodId: ShippingMethodId
    label: string
    cost: number | null
    billedWeight: number
    eligible?: boolean
    reasons?: string[]
  }[]
  discounts: {
    promo: { code: string; discount: number } | null
    promoError?: string
  }
  total: number
}

export type QuoteResult =
  | { ok: true; quote: CartQuote; calculation: CompleteCartCalculation; ctx: CartProductsContext }
  | { ok: false; status: number; error: string; code?: string; reasons?: string[] }

/**
 * Devis panier côté serveur — même calcul que la facturation.
 * checkStock=true pour la création de commande, false pour l'affichage panier.
 */
export async function quoteCart(params: {
  cart: QuoteCartItemInput[]
  shippingMethod?: string
  marketplaceTier?: MarketplaceTier
  promoCode?: string
  checkStock?: boolean
  /** Calcule aussi le coût des 3 méthodes de transport (affichage checkout) */
  includeAllShipping?: boolean
}): Promise<QuoteResult> {
  const { cart, shippingMethod, marketplaceTier = 'standard', promoCode, checkStock = false, includeAllShipping = false } = params

  const method = resolveShippingMethod(shippingMethod)
  if ('error' in method) return { ok: false, status: 400, error: method.error }

  const loaded = await loadCartProducts(cart, { checkStock })
  if (!loaded.ok) return { ok: false, status: 400, error: loaded.error }

  const exchangeRate = await getCNYToXOFRate()
  const calculatorItems = buildCalculatorItems(cart, loaded.ctx, marketplaceTier, exchangeRate)
  const pricingDefaults = readPricingDefaults()
  const calculation = await calculateCartTotal(
    calculatorItems,
    method.internalMethod,
    { rate: method.rate.rate, minimumCharge: method.rate.minimumCharge, label: method.rate.label },
    { serviceFeeTiers: pricingDefaults.serviceFeeTiers }
  )

  const { fees, quantityDiscount, subtotal, shipping } = calculation

  // Éligibilité maritime — mêmes règles que POST /api/order pour que le devis
  // n'annonce jamais une option que la commande refusera.
  const seaEligibility =
    method.internalMethod === 'sea_freight' || includeAllShipping
      ? evaluateSeaFreightEligibility(
          buildSeaFreightMetrics(calculatorItems, subtotal),
          readSeaFreightEligibilitySettings()
        )
      : null

  if (method.internalMethod === 'sea_freight' && seaEligibility && !seaEligibility.eligible) {
    return {
      ok: false,
      status: 400,
      code: 'SEA_FREIGHT_NOT_ELIGIBLE',
      error: 'Le mode maritime est réservé aux commandes volumineuses. Veuillez choisir Express ou Aérien.',
      reasons: seaEligibility.reasons,
    }
  }

  if (!shipping) {
    return { ok: false, status: 400, error: 'Impossible de calculer les frais de transport pour cette commande' }
  }

  let promo: CartQuote['discounts']['promo'] = null
  let promoError: string | undefined
  if (promoCode) {
    const validated = await validatePromoCode(promoCode, subtotal)
    if (validated.valid) promo = { code: validated.code, discount: validated.discount }
    else promoError = validated.reason
  }

  const total = Math.max(0, calculation.total - (promo?.discount || 0))

  // Coût réel des autres méthodes de transport (mêmes items, même poids)
  let shippingOptions: CartQuote['shippingOptions']
  if (includeAllShipping) {
    const rates = getConfiguredShippingRates()
    shippingOptions = []
    for (const methodId of ['air_express', 'air_15', 'sea_freight'] as ShippingMethodId[]) {
      const seaMeta = methodId === 'sea_freight'
        ? {
            eligible: Boolean(seaEligibility?.eligible),
            reasons: seaEligibility && !seaEligibility.eligible ? seaEligibility.reasons : undefined,
          }
        : {}
      if (methodId === method.internalMethod) {
        shippingOptions.push({ methodId, label: method.rate.label, cost: shipping.cost, billedWeight: shipping.billedWeight, ...seaMeta })
        continue
      }
      const r = rates[methodId]
      if (!r) continue
      const c = await calculateCartTotal(
        calculatorItems,
        methodId,
        { rate: r.rate, minimumCharge: r.minimumCharge, label: r.label },
        { serviceFeeTiers: pricingDefaults.serviceFeeTiers }
      )
      if (c.shipping) {
        shippingOptions.push({ methodId, label: r.label, cost: c.shipping.cost, billedWeight: c.shipping.billedWeight, ...seaMeta })
      } else if (methodId === 'sea_freight') {
        // Option non chiffrable (pas de volume) — exposée désactivée pour expliciter le rejet
        shippingOptions.push({ methodId, label: r.label, cost: null, billedWeight: 0, ...seaMeta })
      }
    }
  }

  const quote: CartQuote = {
    currency: 'FCFA',
    items: cart.map((item) => {
      const rawId = String(item.id || '')
      const productId = loaded.ctx.itemProductIdMap.get(rawId) || rawId
      const db = loaded.ctx.dbProductMap.get(productId)
      const variantIds = itemVariantIds(item)
      const resolved = resolveItemUnitPrice(db, item.qty || 1, marketplaceTier, calculation.totalQuantity, exchangeRate, variantIds)
      const { variants } = resolveItemVariants(db, variantIds, exchangeRate)
      return {
        id: rawId,
        productId,
        name: db?.name || item.name || 'Produit',
        qty: item.qty || 1,
        unitPrice: resolved.appliedPrice,
        priceType: resolved.priceType,
        variantIds: variantIds.length > 0 ? variantIds : undefined,
        variantLabels: variants.length > 0 ? variants.map((v) => `${v.groupName}: ${v.name}`) : undefined,
      }
    }),
    pricing: {
      sourcingCost: fees.supplierCost,
      usingRetailPricing: calculation.usingRetailFallback,
      serviceFee: {
        rate: fees.serviceFeeRate,
        amount: fees.serviceFeeAmount,
        standardRate: fees.serviceFeeStandardRate,
        savings: fees.serviceFeeSavings,
      },
      insurance: { rate: fees.insuranceRate, amount: fees.insuranceAmount },
      quantityDiscount:
        quantityDiscount && quantityDiscount.amount > 0
          ? {
              percent: quantityDiscount.percent,
              amount: quantityDiscount.amount,
              label: quantityDiscount.tier?.label || `Réduction ${quantityDiscount.percent}%`,
            }
          : null,
      subtotal,
    },
    shipping: {
      method: method.clientMethod,
      methodId: method.internalMethod,
      label: method.rate.label,
      cost: shipping.cost,
      billedWeight: shipping.billedWeight,
      billingMethod: shipping.billingMethod,
      minimumCharge: shipping.minimumCharge,
    },
    shippingOptions,
    discounts: { promo, promoError },
    total,
  }

  return { ok: true, quote, calculation, ctx: loaded.ctx }
}
