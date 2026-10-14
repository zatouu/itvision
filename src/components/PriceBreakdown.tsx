"use client"

import React from 'react'
import { Info, Package, Shield, Truck, TrendingDown } from 'lucide-react'

interface PriceBreakdownProps {
  // Prix 1688 en yuan (si importé)
  price1688?: number
  exchangeRate?: number
  // Prix converti déjà en FCFA (si existant)
  productCostFCFA?: number
  // Frais
  serviceFeeRate?: number
  insuranceRate?: number
  // Réductions séparées (visuellement distinctes)
  quantityDiscount?: { // Réduction par quantité (existante)
    percent: number
    amount: number
    label: string
  }
  serviceFeeDiscount?: { // Réduction B2B sur frais (nouveau)
    standardRate: number
    appliedRate: number
    savings: number
    tierLabel: string
  }
  // Prix de vente final
  salePrice: number
  // Transport
  shippingCost?: number
  // Affichage compact ou détaillé
  variant?: 'compact' | 'detailed'
  // Estimation d'économie vs prix local
  localPriceEstimate?: number
}

const formatCurrency = (v?: number) =>
  typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-'

/**
 * Composant de décomposition transparente du prix
 * Affiche le détail du calcul pour les produits importés
 */
export function PriceBreakdown({
  price1688,
  exchangeRate = 100,
  productCostFCFA,
  serviceFeeRate = 10,
  insuranceRate = 2.5,
  quantityDiscount,
  serviceFeeDiscount,
  salePrice,
  shippingCost,
  variant = 'detailed',
  localPriceEstimate
}: PriceBreakdownProps) {
  // Calcul du coût fournisseur en FCFA
  const supplierCost = productCostFCFA ?? (price1688 ? price1688 * exchangeRate : 0)

  // Calcul des frais (avec réduction B2B si applicable)
  const standardServiceFee = supplierCost * ((serviceFeeDiscount?.standardRate ?? serviceFeeRate) / 100)
  const actualServiceFeeRate = serviceFeeDiscount?.appliedRate ?? serviceFeeRate
  const serviceFee = supplierCost * (actualServiceFeeRate / 100)
  const serviceFeeSavings = serviceFeeDiscount?.savings ?? (standardServiceFee - serviceFee)
  
  const insuranceFee = supplierCost * (insuranceRate / 100)
  const totalFees = serviceFee + insuranceFee

  // Sous-total avant réductions
  const subtotalBeforeDiscounts = supplierCost + totalFees

  // Total après réductions
  const finalProductPrice = subtotalBeforeDiscounts - (quantityDiscount?.amount || 0)

  // Vérifier si le prix de vente correspond au calcul
  const calculatedPrice = finalProductPrice
  const hasShippingIncluded = salePrice > calculatedPrice + 1000 // Tolérance

  // Estimation économie
  const savings = localPriceEstimate ? localPriceEstimate - (salePrice + (shippingCost || 0)) : null

  if (variant === 'compact') {
    return (
      <div className="text-xs text-gray-500 space-y-1">
        {supplierCost > 0 && (
          <div className="flex justify-between">
            <span>Fournisseur:</span>
            <span>{formatCurrency(supplierCost)}</span>
          </div>
        )}
        {totalFees > 0 && (
          <div className="flex justify-between">
            <span>Frais ({serviceFeeRate}% + {insuranceRate}%):</span>
            <span>{formatCurrency(totalFees)}</span>
          </div>
        )}
        {shippingCost !== undefined && shippingCost > 0 && (
          <div className="flex justify-between">
            <span>Transport:</span>
            <span>{formatCurrency(shippingCost)}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-50/50 to-emerald-50/50 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Info className="w-4 h-4 text-blue-500" />
        <span>Décomposition du prix</span>
      </div>

      {/* Détails */}
      <div className="space-y-2 text-sm">
        {/* Coût fournisseur */}
        {price1688 !== undefined && (
          <div className="flex justify-between items-center text-gray-600">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span>Prix fournisseur (1688)</span>
            </div>
            <div className="text-right">
              <div className="font-medium">¥{price1688.toLocaleString('fr-FR')}</div>
              <div className="text-xs text-gray-400">× {exchangeRate} = {formatCurrency(supplierCost)}</div>
            </div>
          </div>
        )}

        {!price1688 && supplierCost > 0 && (
          <div className="flex justify-between items-center text-gray-600">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span>Coût fournisseur</span>
            </div>
            <span className="font-medium">{formatCurrency(supplierCost)}</span>
          </div>
        )}

        {/* Frais de service */}
        <div className="flex justify-between items-center text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-xs text-emerald-700 font-bold">
              S
            </div>
            <span>Frais de service ({actualServiceFeeRate}%)</span>
            {serviceFeeSavings > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                -{formatCurrency(serviceFeeSavings)}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="font-medium text-emerald-700">+ {formatCurrency(serviceFee)}</span>
            {serviceFeeSavings > 0 && (
              <div className="text-xs text-gray-400 line-through">
                {formatCurrency(standardServiceFee)}
              </div>
            )}
          </div>
        </div>

        {/* Assurance */}
        <div className="flex justify-between items-center text-gray-600">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <span>Assurance ({insuranceRate}%)</span>
          </div>
          <span className="font-medium text-amber-600">+ {formatCurrency(insuranceFee)}</span>
        </div>

        {/* Sous-total avant réduction par quantité */}
        <div className="border-t border-dashed border-gray-200 my-2" />
        <div className="flex justify-between items-center text-sm text-gray-700">
          <span>Sous-total</span>
          <span className="font-medium">{formatCurrency(subtotalBeforeDiscounts)}</span>
        </div>

        {/* Réduction par quantité (si applicable) */}
        {quantityDiscount && quantityDiscount.amount > 0 && (
          <div className="flex justify-between items-center text-emerald-700 bg-emerald-50/50 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm">{quantityDiscount.label}</span>
            </div>
            <span className="font-semibold">-{formatCurrency(quantityDiscount.amount)}</span>
          </div>
        )}

        {/* Transport */}
        {shippingCost !== undefined && (
          <div className="flex justify-between items-center text-gray-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-500" />
              <span>Transport</span>
            </div>
            <span className="font-medium text-orange-700">
              {shippingCost > 0 ? `+ ${formatCurrency(shippingCost)}` : 'À calculer'}
            </span>
          </div>
        )}

        {/* Séparateur */}
        <div className="border-t border-gray-200 my-2" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-lg text-emerald-700">
            {formatCurrency(salePrice + (shippingCost || 0))}
          </span>
        </div>

        {/* Économie estimée */}
        {savings !== null && savings > 0 && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-emerald-100 rounded-lg">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-700">
              Vous économisez {formatCurrency(savings)} par rapport au prix local
            </span>
          </div>
        )}
      </div>

      {/* Badge transparence */}
      <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100">
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full border">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Prix transparent
        </span>
        <span>Sans frais cachés</span>
      </div>
    </div>
  )
}

/**
 * Badge "Prix Transparent" compact
 */
export function TransparentPriceBadge({
  serviceFeeRate = 10,
  insuranceRate = 2.5
}: {
  serviceFeeRate?: number
  insuranceRate?: number
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-50 to-blue-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Prix transparent: {serviceFeeRate}% service + {insuranceRate}% assurance
    </span>
  )
}

/**
 * Tooltip d'explication du prix
 */
export function PriceExplanationTooltip() {
  return (
    <div className="group relative inline-block">
      <Info className="w-4 h-4 text-gray-400 cursor-help" />
      <div className="invisible group-hover:visible absolute z-50 w-72 p-4 bg-white rounded-xl shadow-xl border text-sm text-gray-600 -top-2 left-6">
        <p className="font-medium text-gray-900 mb-2">Comment est calculé le prix ?</p>
        <ul className="space-y-1.5">
          <li className="flex gap-2">
            <span className="text-emerald-500">1.</span>
            <span>Prix fournisseur converti depuis 1688.com</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500">2.</span>
            <span>Frais de service (10%) pour la coordination</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500">3.</span>
            <span>Assurance (2.5%) pour protéger votre commande</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500">4.</span>
            <span>Transport selon le mode choisi</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
