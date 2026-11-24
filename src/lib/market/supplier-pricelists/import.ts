/**
 * Import d'une grille fournisseur direct dans le catalogue DDM : aperçu (rien n'est écrit) puis application.
 * Utilisé par /api/admin/supplier-pricelists (bouton admin) et scripts/import-supplier-pricelist.ts.
 *
 * - une fiche par famille, variantes à prix propre (price1688 en ¥, EXW : transport Chine 0 ¥, payé par lot) ;
 * - prix de gros calé sur Dakar (pricing-rules.ts) : marge produit unique pour la famille, paliers dégressifs ;
 * - lot minimum DDM (min-order.ts) : valeur de ligne, MOQ usine, maritime pour les articles lourds ;
 * - achat groupé activé (seuil = plus petit MOQ usine de la famille, cible = plus grand) ;
 * - idempotent : clé sourcing.platform='factory' + sourcing.externalId='<grille>:<famille>'. Une fiche existante
 *   ne reçoit que prix, paliers, lot minimum, MOQ et variantes : nom, description et photos édités sont conservés.
 */
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { readSharedPricing, type SharedPricingConfig } from '@/lib/pricing/shared-settings'
import { importPricing } from '@/lib/market/catalog-import'
import { ddmMinOrderQty, type MinOrderResult } from './min-order'
import { DDM_PRICING_RULES, marketPricing, paidPerUnit, type FeeSettings, type MarketPricingResult } from './pricing-rules'
import type { SupplierFamily, SupplierPricelist } from './types'

const PLATFORM = 'factory'
/** Nom vendeur affiché : jamais celui de l'usine (les clients la contacteraient en direct). */
const SELLER_NAME = 'DDM by IT Vision'

/** Densité d'un carton d'accessoires (kg/m³) pour estimer le volume quand la grille ne le donne pas. */
const EST_DENSITY_KG_M3 = 250
const volumeOf = (f: SupplierFamily) => f.volumeM3 ?? Math.round((f.weightKg / EST_DENSITY_KG_M3) * 100000) / 100000

/** Marge plancher acceptée quand le gain par unité reste significatif (articles chers : bobines, émetteurs). */
const MIN_UNIT_GAIN_AT_FLOOR_FCFA = 2_000

const round2 = (n: number) => Math.round(n * 100) / 100
const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

export interface MarketComparison {
  variant: string
  /** Relevé emprunté à une famille comparable (prix ajusté au ratio des coûts) */
  comparableTo?: string
  /** Relevés de la variante (boutique, prix) */
  shops: Array<{ shop: string; url: string; fcfa: number }>
  marketFcfa: number
  /** Prix payé par unité au lot minimum (frais, remise et transport estimé compris) */
  paidAtMinFcfa: number
  /** Prix payé par unité au dernier palier */
  paidAtBulkFcfa: number
  /** Écarts vs Dakar (négatif = moins cher) */
  gapAtMinPercent: number
  gapAtBulkPercent: number
}

export interface PricelistRow {
  key: string
  name: string
  category: string
  subCategory: string
  corporate: boolean
  image: string
  variants: Array<{ name: string; cny: number; factoryMoq: number; unitFcfa: number }>
  /** Prix catalogue unitaire de la variante de base (hors frais et transport) */
  unitFcfa: number
  minOrder: MinOrderResult
  pricing: Omit<MarketPricingResult, 'tiers'> & { tiers: Array<{ minQty: number; marginRate: number; unitFcfa: number; paidFcfa: number }> }
  /** Variante de base au lot minimum : prix payé, transport, gain DDM par unité */
  atMin: { paidFcfa: number; shippingFcfa: number; shippingMode: 'aérien' | 'maritime'; costFcfa: number; gainFcfa: number }
  /** Variante de base au gros volume, en maritime groupé (si la commande y est éligible) */
  seaAtBulk: { qty: number; paidFcfa: number; shippingFcfa: number }
  groupBuy: { minQty: number; targetQty: number }
  market: MarketComparison[]
  question?: string
  /** Coché par défaut : prix de gros avantageux, ou marge plancher avec un gain par unité significatif */
  recommended: boolean
  status: 'new' | 'update' | 'unchanged' | 'skipped'
  productId?: string
  isPublished?: boolean
}

export interface PricelistPlan {
  id: string
  supplier: SupplierPricelist['supplier']
  rules: { pricing: typeof DDM_PRICING_RULES; fallbackMarginRate: number }
  rows: PricelistRow[]
  totals: { families: number; new: number; update: number; unchanged: number; skipped: number; corporate: number; notRecommended: number }
}

function buildVariants(f: SupplierFamily, imageBase: string) {
  const pack = f.packOf || 1
  const ids = new Set<string>()
  return f.variants.map(([label, cny, moq, image], i) => {
    const id = `zl-${slug(label)}`
    if (ids.has(id)) throw new Error(`${f.key} : variante en double « ${label} »`)
    ids.add(id)
    if (!(cny > 0) || !(moq > 0)) throw new Error(`${f.key} / ${label} : prix ou MOQ invalide`)
    return {
      id,
      name: label,
      sku: `ZL-${f.key.toUpperCase()}-${i + 1}`,
      image: `${imageBase}/${image || f.image}.jpg`,
      price1688: round2(cny * pack),
      moq: Math.ceil(moq / pack),
      isDefault: i === 0,
    }
  })
}

/** Transport par unité pour q unités, d'après les tarifs partagés (estimation : le poids réel fait foi). */
function shippingPerUnit(config: SharedPricingConfig, weightKg: number, volumeM3: number | undefined, qty: number, seaOnly: boolean) {
  if (seaOnly && volumeM3) return { mode: 'maritime' as const, perUnitFcfa: Math.round(volumeM3 * config.shippingRates.sea_freight.rate) }
  const air = config.shippingRates.air_15
  return { mode: 'aérien' as const, perUnitFcfa: Math.round(Math.max(air.minimumCharge ?? 0, weightKg * qty * air.rate) / qty) }
}

function feeSettings(config: SharedPricingConfig): FeeSettings {
  return {
    insuranceRate: config.defaults.defaultInsuranceRate,
    serviceFeeTiers: config.defaults.serviceFeeTiers,
    singleImportServiceFeeRate: config.defaults.singleImportServiceFeeRate,
  }
}

type BuiltVariant = ReturnType<typeof buildVariants>[number]
type Observation = SupplierPricelist['market'][string][number]

/**
 * Références de prix Dakar : relevés de la famille, sinon ceux de la famille comparable (`marketLike`),
 * ramenés à la variante de même libellé (ou de même rang) au prorata des coûts usine.
 */
function marketRefs(list: SupplierPricelist, f: SupplierFamily, variants: BuiltVariant[]) {
  const group = (obs: Observation[], pick: (label: string) => { variant: BuiltVariant; ratio: number; kgRatio: number } | null) =>
    Array.from(new Set(obs.map(o => o.variant))).flatMap(label => {
      const hit = pick(label)
      if (!hit) return []
      const sel = obs.filter(o => o.variant === label)
      return [{
        variant: hit.variant,
        obs: sel,
        kg: median(sel.map(o => o.kg ?? f.weightKg / hit.kgRatio)) * hit.kgRatio,
        marketFcfa: Math.round(median(sel.map(o => o.fcfa)) * hit.ratio),
      }]
    })

  const own = list.market[f.key] || []
  if (own.length || !f.marketLike) {
    return {
      comparableTo: undefined,
      refs: group(own, label => {
        const variant = variants.find(v => v.name === label)
        if (!variant) throw new Error(`${f.key} : relevé marché sur une variante inconnue « ${label} »`)
        return { variant, ratio: 1, kgRatio: 1 }
      }),
    }
  }
  const like = list.families.find(x => x.key === f.marketLike)
  if (!like) throw new Error(`${f.key} : famille comparable inconnue « ${f.marketLike} »`)
  const likeVariants = buildVariants(like, list.imageBase)
  return {
    comparableTo: like.name,
    refs: group(list.market[like.key] || [], label => {
      const index = likeVariants.findIndex(v => v.name === label)
      const variant = variants.find(v => v.name === label) ?? variants[index]
      if (index < 0 || !variant) return null
      return { variant, ratio: variant.price1688 / likeVariants[index].price1688, kgRatio: f.weightKg / like.weightKg }
    }),
  }
}

function computeFamily(list: SupplierPricelist, f: SupplierFamily, config: SharedPricingConfig, fallbackMarginRate: number) {
  const rate = config.sourceCurrencyRates.CNY
  const fees = feeSettings(config)
  const variants = buildVariants(f, list.imageBase)
  const base = variants[0]
  const moqs = variants.map(v => v.moq)
  const volume = volumeOf(f)
  const ship = (kg: number, qty: number, seaOnly: boolean) =>
    shippingPerUnit(config, kg, volume * (kg / f.weightKg), qty, seaOnly)

  const { refs, comparableTo } = marketRefs(list, f, variants)

  // Lot minimum ↔ prix : le lot dépend du prix unitaire, le prix du lot (frais, remise, transport) — 2 passes suffisent.
  let unitOf = (cny: number) => Math.round(cny * rate * (1 + Math.max(DDM_PRICING_RULES.minMarginRate, fallbackMarginRate) / 100))
  let minOrder!: MinOrderResult
  let pricing!: MarketPricingResult
  for (let pass = 0; pass < 2; pass++) {
    const computed = ddmMinOrderQty({
      unitPriceFcfa: Math.min(...variants.map(v => unitOf(v.price1688))),
      factoryMoq: Math.min(...moqs), weightKg: f.weightKg, volumeM3: f.volumeM3,
    })
    minOrder = f.minOrderQty ? { ...computed, qty: f.minOrderQty, explanation: `fixé dans la grille (calcul : ${computed.qty})` } : computed
    const seaOnly = minOrder.seaOnly
    pricing = marketPricing({
      refs: refs.map(r => ({ costFcfa: r.variant.price1688 * rate, marketFcfa: r.marketFcfa, shippingPerUnit: (q: number) => ship(r.kg, q, seaOnly).perUnitFcfa })),
      minOrderQty: minOrder.qty,
      maxFactoryMoq: Math.max(...moqs),
      fees,
      fallbackMarginRate,
    })
    if (comparableTo && pricing.source === 'marché') pricing = { ...pricing, source: 'comparable' }
    const margin = pricing.marginRate
    unitOf = (cny: number) => Math.round(cny * rate * (1 + margin / 100))
  }

  const L = minOrder.qty
  const costBase = base.price1688 * rate
  const unitBase = unitOf(base.price1688)
  const tiers = pricing.tiers.map(t => {
    const unit = Math.round(costBase * (1 + t.marginRate / 100))
    return { ...t, unitFcfa: unit, paidFcfa: Math.round(paidPerUnit(unit, t.minQty, fees, ship(f.weightKg, t.minQty, minOrder.seaOnly).perUnitFcfa)) }
  })
  const shipAtMin = ship(f.weightKg, L, minOrder.seaOnly)
  const paidAtMin = Math.round(paidPerUnit(unitBase, L, fees, shipAtMin.perUnitFcfa))
  // Gros volume en maritime groupé (info) : dernier palier, ou 10 lots
  const bulk = tiers.at(-1) ?? { minQty: L * 10, unitFcfa: unitBase }
  const seaPerUnit = Math.round(volume * config.shippingRates.sea_freight.rate)
  const seaAtBulk = { qty: bulk.minQty, paidFcfa: Math.round(paidPerUnit(bulk.unitFcfa, bulk.minQty, fees, seaPerUnit)), shippingFcfa: seaPerUnit }

  const market: MarketComparison[] = refs.map(r => {
    const cost = r.variant.price1688 * rate
    const paidAt = (qty: number, margin: number) => Math.round(paidPerUnit(cost * (1 + margin / 100), qty, fees, ship(r.kg, qty, minOrder.seaOnly).perUnitFcfa))
    const last = tiers.at(-1)
    const paidAtMinFcfa = paidAt(L, pricing.marginRate)
    const paidAtBulkFcfa = last ? paidAt(last.minQty, last.marginRate) : paidAtMinFcfa
    const gap = (paid: number) => Math.round(((paid - r.marketFcfa) / r.marketFcfa) * 100)
    return {
      variant: r.variant.name, comparableTo, shops: r.obs.map(o => ({ shop: o.shop, url: o.url, fcfa: o.fcfa })), marketFcfa: r.marketFcfa,
      paidAtMinFcfa, paidAtBulkFcfa, gapAtMinPercent: gap(paidAtMinFcfa), gapAtBulkPercent: gap(paidAtBulkFcfa),
    }
  })

  const priced = importPricing({ sourcePrice: base.price1688, currency: 'CNY', platform: PLATFORM, marginRate: pricing.marginRate }, config)
  const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} F`
  const notes = [
    `Grille ${list.supplier.name} du ${list.supplier.priceListDate} (reçue le ${list.supplier.receivedAt}), prix EXW Dongguan.`,
    `MOQ usine par variante${f.packOf ? ` (en lots de ${f.packOf})` : ''} : ${variants.map(v => `${v.name} ${v.moq}`).join(' · ')}.`,
    `Lot minimum DDM ${L} : ${minOrder.explanation}.`,
    `Prix ${{ marché: 'calé sur Dakar', comparable: `calé sur Dakar via ${comparableTo}`, estimé: 'estimé (pas de relevé Dakar)' }[pricing.source]} : marge ${pricing.marginRate} %${tiers.length ? `, paliers ${tiers.map(t => `${t.minQty}+ → ${fcfa(t.unitFcfa)}`).join(', ')}` : ''}.`,
    ...market.map(m => `Dakar ${m.variant} : ${fcfa(m.marketFcfa)} — DDM rendu ${fcfa(m.paidAtMinFcfa)} (${m.gapAtMinPercent} %) au lot minimum.`),
    list.questions[f.key] ? `À confirmer avec l'usine : ${list.questions[f.key]}` : '',
  ].filter(Boolean).join('\n')

  const fields = {
    price: priced.price,
    // Égal au prix unitaire : pas de « prix pro » en plus des paliers (le lot minimum est déjà un achat de gros)
    b2bPrice: unitBase,
    price1688: base.price1688,
    price1688Currency: 'CNY',
    exchangeRate: priced.exchangeRate,
    marginRate: pricing.marginRate,
    serviceFeeRate: priced.serviceFeeRate,
    insuranceRate: priced.insuranceRate,
    priceTiers: tiers.map(t => ({ minQty: t.minQty, price: t.unitFcfa, discount: Math.round((1 - t.unitFcfa / unitBase) * 100) })),
    variantGroups: [{ name: f.variantGroup, variants: variants.map(({ moq: _moq, ...v }) => v) }],
    minOrderQty: L,
    groupBuyEnabled: true,
    groupBuyMinQty: Math.max(L, Math.min(...moqs)),
    groupBuyTargetQty: Math.max(L, ...moqs),
    // Volume (estimé si absent de la grille) : rend le maritime proposable au checkout
    volumeM3: volumeOf(f),
    'sourcing.sourcePrice': base.price1688,
    'sourcing.sourceCurrency': 'CNY',
    'sourcing.inlandTransportCny': 0,
    'sourcing.notes': notes,
  }

  const row: Omit<PricelistRow, 'status' | 'productId' | 'isPublished'> = {
    key: f.key,
    name: f.name,
    category: f.category,
    subCategory: f.subCategory,
    corporate: !!f.corporate,
    image: `${list.imageBase}/${f.image}.jpg`,
    variants: variants.map(v => ({ name: v.name, cny: v.price1688, factoryMoq: v.moq, unitFcfa: unitOf(v.price1688) })),
    unitFcfa: unitBase,
    minOrder,
    pricing: { ...pricing, tiers },
    atMin: { paidFcfa: paidAtMin, shippingFcfa: shipAtMin.perUnitFcfa, shippingMode: shipAtMin.mode, costFcfa: Math.round(costBase), gainFcfa: Math.round(paidAtMin - shipAtMin.perUnitFcfa - costBase) },
    seaAtBulk,
    groupBuy: { minQty: fields.groupBuyMinQty, targetQty: fields.groupBuyTargetQty },
    market,
    question: list.questions[f.key],
    recommended: pricing.competitiveness === 'ok'
      || (pricing.competitiveness === 'marge plancher' && paidAtMin - shipAtMin.perUnitFcfa - costBase >= MIN_UNIT_GAIN_AT_FLOOR_FCFA),
  }
  return { row, fields, externalId: `${list.id}:${f.key}`, base, priced }
}

/**
 * Marge des familles sans aucun relevé : 1er quartile des marges des familles relevées et compétitives
 * (prudent : la médiane, tirée par les adaptateurs très rentables, surévaluerait les autres).
 */
function fallbackMargin(list: SupplierPricelist, config: SharedPricingConfig) {
  const margins = list.families
    .filter(f => list.market[f.key]?.length)
    .map(f => computeFamily(list, f, config, DDM_PRICING_RULES.minMarginRate).row.pricing)
    .filter(p => p.competitiveness === 'ok')
    .map(p => p.marginRate)
    .sort((a, b) => a - b)
  return margins.length ? Math.round(margins[Math.floor((margins.length - 1) / 4)]) : DDM_PRICING_RULES.minMarginRate
}

async function run(list: SupplierPricelist, mode: { apply: boolean; publish?: boolean; keys?: string[] }): Promise<PricelistPlan> {
  await connectMongoose()
  const { config } = await readSharedPricing()
  const fallbackMarginRate = fallbackMargin(list, config)
  const selected = mode.keys ? new Set(mode.keys) : null
  const rows: PricelistRow[] = []

  for (const f of list.families) {
    const { row, fields, externalId, base, priced } = computeFamily(list, f, config, fallbackMarginRate)
    const existing = await Product.findOne({ 'sourcing.platform': PLATFORM, 'sourcing.externalId': externalId })
    const skip = mode.apply && selected && !selected.has(f.key)

    if (existing) {
      const previous = existing.price1688
      existing.set(fields)
      if (mode.publish) existing.isPublished = true
      if (previous !== base.price1688) {
        existing.priceHistory = [...(existing.priceHistory || []), {
          date: new Date(), price1688: base.price1688, exchangeRate: priced.exchangeRate,
          changePercent: previous ? round2(((base.price1688 - previous) / previous) * 100) : 0, source: 'manual_update',
        }]
      }
      const changed = existing.isModified()
      if (changed && mode.apply && !skip) await existing.save()
      rows.push({ ...row, status: skip ? 'skipped' : changed ? 'update' : 'unchanged', productId: String(existing._id), isPublished: existing.isPublished })
      continue
    }
    if (skip) { rows.push({ ...row, status: 'skipped' }); continue }

    let productId: string | undefined
    if (mode.apply) {
      const created = await Product.create({
        ...Object.fromEntries(Object.entries(fields).filter(([k]) => !k.startsWith('sourcing.'))),
        name: f.name,
        description: f.description,
        features: f.features || [],
        specifications: f.specifications,
        category: f.category,
        tags: Array.from(new Set(['import-chine', 'fournisseur-direct', f.subCategory, ...(f.tags || [])])),
        image: row.image,
        gallery: Array.from(new Set([f.image, ...(f.gallery || [])])).map(n => `${list.imageBase}/${n}.jpg`),
        currency: 'FCFA',
        condition: 'new',
        stockStatus: 'preorder',
        stockQuantity: 100,
        requiresQuote: false,
        isPublished: !!mode.publish,
        weightKg: f.weightKg,
        weightEstimated: true,
        channels: f.corporate ? ['marketplace', 'corporate'] : ['marketplace'],
        corporateVisible: !!f.corporate,
        sellerName: SELLER_NAME,
        sourcing: {
          platform: PLATFORM,
          externalId,
          supplierName: list.supplier.name,
          supplierContact: list.supplier.contact,
          sourcePrice: base.price1688,
          sourceCurrency: 'CNY',
          inlandTransportCny: 0,
          notes: fields['sourcing.notes'],
        },
        priceHistory: [{ date: new Date(), price1688: base.price1688, exchangeRate: priced.exchangeRate, source: 'import' }],
        lastPriceCheckAt: new Date(),
      })
      productId = String(created._id)
    }
    rows.push({ ...row, status: 'new', productId, isPublished: mode.apply ? !!mode.publish : undefined })
  }

  const count = (s: PricelistRow['status']) => rows.filter(r => r.status === s).length
  return {
    id: list.id,
    supplier: list.supplier,
    rules: { pricing: DDM_PRICING_RULES, fallbackMarginRate },
    rows,
    totals: {
      families: rows.length, new: count('new'), update: count('update'), unchanged: count('unchanged'), skipped: count('skipped'),
      corporate: rows.filter(r => r.corporate).length, notRecommended: rows.filter(r => !r.recommended).length,
    },
  }
}

/** Aperçu : calcule tout, compare à la base, n'écrit rien. */
export function previewPricelist(list: SupplierPricelist) {
  return run(list, { apply: false })
}

/** Application des familles `keys` (toutes si absent) : création / mise à jour ; `publish` les rend visibles. */
export function applyPricelist(list: SupplierPricelist, options: { publish?: boolean; keys?: string[] } = {}) {
  return run(list, { apply: true, ...options })
}
