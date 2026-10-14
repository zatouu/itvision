"use client"

import React from 'react'
import { TrendingDown, Package, Award, Building2, ChevronRight } from 'lucide-react'
import { getNextTierProgress, getServiceFeeTier, getTiersInfo, type ServiceFeeTier } from '@/lib/pricing/tiered-service-fees'

interface ServiceFeeTierProgressProps {
  currentAmount: number // Montant de commande actuel en FCFA
  currentFeeRate: number // Taux actuel appliqué
  variant?: 'compact' | 'full'
  tiers?: ServiceFeeTier[]
  standardFeeRate?: number
}

const formatCurrency = (v?: number) =>
  typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-'

/**
 * Composant d'affichage des paliers de frais de service
 * Motive les clients à augmenter leur panier pour obtenir des réductions
 */
export function ServiceFeeTierProgress({
  currentAmount,
  currentFeeRate,
  variant = 'full',
  tiers,
  standardFeeRate
}: ServiceFeeTierProgressProps) {
  const effectiveTiers = Array.isArray(tiers) && tiers.length > 0 ? tiers : undefined
  const tiersInfo = getTiersInfo(effectiveTiers)
  const progress = getNextTierProgress(currentAmount, effectiveTiers)
  const activeTier = getServiceFeeTier(currentAmount, effectiveTiers)
  const baseFeeRate = typeof standardFeeRate === 'number' ? standardFeeRate : tiersInfo[0]?.feeRate ?? 10
  const savingsVsStandard = Math.round(currentAmount * (baseFeeRate - currentFeeRate) / 100)

  // Icônes par palier
  const tierIcons = [Package, Award, Building2, Building2]

  if (variant === 'compact') {
    if (!progress.hasNextTier) {
      return (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
          <Award className="w-3.5 h-3.5" />
          <span>
            Tarif {activeTier.label} actif
            {baseFeeRate > currentFeeRate ? ` (-${Math.round(baseFeeRate - currentFeeRate)}%)` : ''}
          </span>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Progression vers tarif {progress.nextTier?.label}</span>
          <span className="font-medium text-emerald-700">{progress.progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
        {progress.amountNeeded && progress.amountNeeded > 0 && (
          <p className="text-xs text-gray-500">
            Plus que {formatCurrency(progress.amountNeeded)} pour -{progress.nextTier?.feeRate}% de frais
          </p>
        )}
      </div>
    )
  }

  // Version complète
  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-emerald-600" />
        <h4 className="font-semibold text-gray-900">Réductions par volume</h4>
      </div>

      {/* Économie actuelle */}
      {savingsVsStandard > 0 && (
        <div className="flex items-center gap-2 p-2 bg-emerald-100 rounded-lg text-sm">
          <span className="text-emerald-700 font-medium">
            💰 Vous économisez {formatCurrency(savingsVsStandard)} sur les frais de service
          </span>
        </div>
      )}

      {/* Progression vers prochain palier */}
      {progress.hasNextTier && progress.nextTier && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Prochain palier: {progress.nextTier.label}</span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              -{progress.nextTier.feeRate}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          {progress.amountNeeded && progress.amountNeeded > 0 && (
            <p className="text-xs text-gray-500">
              Ajoutez {formatCurrency(progress.amountNeeded)} pour obtenir des frais réduits
            </p>
          )}
        </div>
      )}

      {/* Liste des paliers */}
      <div className="space-y-2 pt-2 border-t border-gray-200">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tous les paliers</p>
        {tiersInfo.map((tier, idx) => {
          const isCurrent = currentAmount >= tier.minAmount && (tier.maxAmount === undefined || currentAmount < tier.maxAmount)
          const Icon = tierIcons[idx] || Package
          return (
            <div
              key={`${tier.label}-${tier.minAmount}`}
              className={`flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${
                isCurrent
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isCurrent ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={isCurrent ? 'font-semibold' : ''}>{tier.label}</span>
                  {isCurrent && (
                    <span className="text-xs bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded">
                      Actif
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {formatCurrency(tier.minAmount)} {tier.maxAmount ? `- ${formatCurrency(tier.maxAmount)}` : 'et plus'}
                </p>
              </div>
              <span className={`font-semibold ${isCurrent ? 'text-emerald-700' : ''}`}>
                {tier.feeRate}%
              </span>
              {idx < tiersInfo.length - 1 && !isCurrent && (
                <ChevronRight className="w-4 h-4 text-gray-300" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Badge affichant le taux de frais actuel
 */
export function CurrentFeeRateBadge({ rate }: { rate: number }) {
  const labels: Record<number, { label: string; color: string }> = {
    10: { label: 'Standard', color: 'bg-gray-100 text-gray-700' },
    8: { label: 'Volume', color: 'bg-blue-100 text-blue-700' },
    6: { label: 'Pro', color: 'bg-emerald-100 text-emerald-700' },
    5: { label: 'Entreprise', color: 'bg-purple-100 text-purple-700' },
  }

  const config = labels[rate] || { label: 'Personnalisé', color: 'bg-gray-100 text-gray-700' }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label} ({rate}%)
    </span>
  )
}
