'use client'

import { useMemo } from 'react'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import {
  ShoppingCart,
  TrendingDown,
  Info,
  Sparkles
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface PriceTier {
  minQty: number
  maxQty?: number
  price: number
  discount?: number
}

export interface PricingFees {
  serviceFeeRate: number
  serviceFeeAmount: number
  insuranceRate: number
  insuranceAmount: number
}

export interface ProductPriceBlockProps {
  /** Prix de base/source (coût fournisseur) */
  baseCost: number | null
  /** Prix de vente (après marge) */
  salePrice: number | null
  /** Prix total avec frais inclus */
  totalWithFees: number | null
  /** Taux de marge en pourcentage */
  marginRate?: number
  /** Devise (ex: 'FCFA') */
  currency: string
  /** Détail des frais */
  fees?: PricingFees | null
  /** Paliers de prix dégressifs */
  priceTiers?: PriceTier[]
  /** Quantité actuellement sélectionnée */
  quantity?: number
  /** Sous-total (unitPrice * quantity) */
  subtotal?: number
  /** Le produit est-il importé? */
  isImported?: boolean
  /** Afficher les paliers dans un bloc séparé */
  showTiersBlock?: boolean
  /** Classe CSS additionnelle */
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (amount?: number | null, currency = 'FCFA') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

/**
 * Calcule le palier applicable pour une quantité donnée
 */
function getApplicableTier(quantity: number, tiers: PriceTier[]): PriceTier | null {
  if (!tiers || tiers.length === 0) return null
  
  // Trier par minQty décroissant pour trouver le meilleur palier applicable
  const sortedTiers = [...tiers].sort((a, b) => b.minQty - a.minQty)
  
  for (const tier of sortedTiers) {
    if (quantity >= tier.minQty) {
      // Vérifier maxQty si défini
      if (!tier.maxQty || quantity <= tier.maxQty) {
        return tier
      }
    }
  }
  
  return null
}

/**
 * Calcule les économies potentielles par rapport au prix de base
 */
function calculateSavings(basePrice: number, tierPrice: number): number {
  if (basePrice <= 0) return 0
  return Math.round(((basePrice - tierPrice) / basePrice) * 100)
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function ProductPriceBlock({
  baseCost,
  salePrice,
  totalWithFees,
  marginRate = 25,
  currency,
  fees,
  priceTiers,
  quantity = 1,
  subtotal,
  isImported,
  showTiersBlock = true,
  className
}: ProductPriceBlockProps) {
  // Prix unitaire effectif (avec frais si disponible)
  const effectiveUnitPrice = totalWithFees ?? salePrice

  // Palier applicable pour la quantité actuelle
  const applicableTier = useMemo(() => {
    if (!priceTiers || priceTiers.length === 0) return null
    return getApplicableTier(quantity, priceTiers)
  }, [quantity, priceTiers])

  // Prix unitaire avec palier
  const tierAdjustedPrice = applicableTier?.price ?? effectiveUnitPrice

  // Économies si palier appliqué
  const tierSavings = useMemo(() => {
    if (!effectiveUnitPrice || !applicableTier) return 0
    return calculateSavings(effectiveUnitPrice, applicableTier.price)
  }, [effectiveUnitPrice, applicableTier])

  // Meilleur palier disponible
  const bestTier = useMemo(() => {
    if (!priceTiers || priceTiers.length === 0) return null
    return priceTiers.reduce((best, tier) => 
      tier.price < best.price ? tier : best
    , priceTiers[0])
  }, [priceTiers])

  // Économie maximale possible
  const maxSavings = useMemo(() => {
    if (!effectiveUnitPrice || !bestTier) return 0
    return calculateSavings(effectiveUnitPrice, bestTier.price)
  }, [effectiveUnitPrice, bestTier])

  return (
    <div className={clsx('space-y-4', className)}>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BLOC PRIX INDIVIDUEL - Structure détaillée                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="relative">
        {/* Badge */}
        <div className="absolute -top-3 left-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10">
          💳 PRIX INDIVIDUEL
        </div>

        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 pt-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            Structure de prix - Achat standard
          </h3>

          <div className="text-sm text-gray-700 space-y-2">
            {/* Prix source (attractif) */}
            {baseCost !== null && (
              <div className="flex justify-between items-center bg-blue-50 -mx-4 px-4 py-2 border-b border-blue-100">
                <span className="text-blue-700 font-medium">💰 Prix source</span>
                <div className="text-right">
                  <span className="font-bold text-blue-600 text-lg">
                    {formatCurrency(baseCost, currency)}
                  </span>
                  <div className="text-[10px] text-blue-500">
                    Prix affiché sur le catalogue
                  </div>
                </div>
              </div>
            )}

            {/* Détail des frais */}
            {fees && (
              <>
                {/* Marge commerciale */}
                {baseCost !== null && salePrice !== null && salePrice > baseCost && (
                  <div className="flex justify-between text-gray-600">
                    <span>Marge commerciale ({marginRate}%)</span>
                    <span className="font-medium">
                      +{formatCurrency(salePrice - baseCost, currency)}
                    </span>
                  </div>
                )}

                {/* Frais de service */}
                <div className="flex justify-between text-gray-600">
                  <span>Frais de service ({fees.serviceFeeRate}%)</span>
                  <span className="font-medium">
                    +{formatCurrency(fees.serviceFeeAmount, currency)}
                  </span>
                </div>

                {/* Assurance */}
                <div className="flex justify-between text-gray-600">
                  <span>Assurance ({fees.insuranceRate}%)</span>
                  <span className="font-medium">
                    +{formatCurrency(fees.insuranceAmount, currency)}
                  </span>
                </div>

                {/* Séparateur + Total */}
                <div className="border-t-2 border-emerald-300 pt-3 mt-3 flex justify-between text-gray-800 font-bold">
                  <span>Prix unitaire TTC</span>
                  <span className="text-emerald-600 text-xl">
                    {formatCurrency(
                      totalWithFees ?? 
                      Math.round(
                        (salePrice ?? 0) +
                        (fees.serviceFeeAmount ?? 0) +
                        (fees.insuranceAmount ?? 0)
                      ),
                      currency
                    )}
                  </span>
                </div>
              </>
            )}

            {/* Si pas de fees détaillés, afficher salePrice */}
            {!fees && salePrice && (
              <div className="border-t border-emerald-200 pt-2 flex justify-between text-gray-800 font-bold">
                <span>Prix unitaire</span>
                <span className="text-emerald-600 text-lg">
                  {formatCurrency(salePrice, currency)}
                </span>
              </div>
            )}

            {/* Indication palier appliqué */}
            {applicableTier && tierSavings > 0 && (
              <div className="mt-3 p-2 bg-emerald-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Palier {applicableTier.minQty}+ appliqué
                  </span>
                </div>
                <span className="font-bold text-emerald-600">
                  -{tierSavings}% → {formatCurrency(applicableTier.price, currency)}
                </span>
              </div>
            )}

            {/* Note transport */}
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <span>
                Transport non inclus — le coût exact sera calculé selon le poids total de votre commande.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BLOC PALIERS DE PRIX DÉGRESSIFS                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showTiersBlock && priceTiers && priceTiers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          {/* Badge */}
          <div className="absolute -top-3 left-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10">
            📊 REMISES QUANTITÉ
          </div>

          <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300 rounded-2xl shadow-lg">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-emerald-800 text-lg flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Prix dégressifs
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Commandez plus, payez moins par unité
                </p>
              </div>
              {maxSavings > 0 && (
                <div className="text-right">
                  <span className="text-xs text-gray-500">Jusqu&apos;à</span>
                  <div className="text-lg font-bold text-emerald-600">
                    -{maxSavings}%
                  </div>
                </div>
              )}
            </div>

            {/* Grille des paliers */}
            <div className="grid grid-cols-3 gap-2">
              {priceTiers.slice(0, 3).map((tier, i) => {
                const isLast = i === Math.min(priceTiers.length - 1, 2)
                const isActive = applicableTier?.minQty === tier.minQty
                
                return (
                  <div
                    key={`tier-${i}`}
                    className={clsx(
                      'relative p-3 rounded-xl border text-center transition-all',
                      isLast
                        ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-200'
                        : isActive
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
                        : 'bg-white border-gray-200'
                    )}
                  >
                    {isLast && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        MEILLEUR
                      </span>
                    )}
                    {isActive && !isLast && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        ACTIF
                      </span>
                    )}
                    <div className="text-lg font-bold text-gray-800">
                      {tier.minQty}+ unités
                    </div>
                    <div
                      className={clsx(
                        'text-base font-semibold',
                        isLast ? 'text-emerald-600' : 'text-gray-700'
                      )}
                    >
                      {formatCurrency(tier.price, currency)}
                    </div>
                    <div className="text-[10px] text-gray-400">par unité</div>
                    {tier.discount && tier.discount > 0 && (
                      <div className="mt-1 text-xs text-emerald-600 font-medium">
                        -{tier.discount}%
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Note explicative */}
            <p className="text-center text-[11px] text-gray-500 mt-3">
              💡 Ces prix s&apos;appliquent automatiquement selon la quantité commandée
            </p>
          </div>
        </motion.div>
      )}

      {/* Conseil achats en gros pour produits importés */}
      {isImported && (
        <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-700">Conseil :</span>
            <span className="text-amber-600">
              {' '}Commandez en gros pour réduire les frais de transport au kilo ! Plus de quantité = meilleur prix unitaire.
            </span>
          </div>
        </div>
      )}

      {/* Sous-total si quantité > 1 */}
      {subtotal !== undefined && quantity > 1 && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm flex items-center justify-between">
          <div className="text-gray-600">
            Sous-total ({quantity} × {formatCurrency(tierAdjustedPrice, currency)})
          </div>
          <div className="font-semibold text-lg text-emerald-600">
            {formatCurrency(subtotal, currency)}
          </div>
        </div>
      )}
    </div>
  )
}
