'use client'

import { useState, useEffect } from 'react'
import { Calculator, TrendingUp, DollarSign, Package, Truck, Info, Loader2 } from 'lucide-react'
import type { ShippingMethodId } from '@/lib/logistics'

interface Pricing1688Info {
  price1688: number
  price1688Currency: string
  exchangeRate: number
  serviceFeeRate?: number | null
  insuranceRate?: number | null
}

interface ProductPricing1688Props {
  productId?: string
  pricing1688: Pricing1688Info | null
  weightKg?: number | null
  volumeM3?: number | null
  baseCost?: number | null
  orderQuantity?: number
}

interface SimulationResult {
  breakdown: {
    productCostFCFA: number
    shippingCostReal: number
    serviceFee: number
    insuranceFee: number
    totalRealCost: number
    shippingCostClient: number
    totalClientPrice: number
    shippingMargin: number
    netMargin: number
    marginPercentage: number
    cumulativeMargin?: number
    estimatedMonthlyProfit?: number
  }
  currency: string
  shippingMethod: {
    id: ShippingMethodId
    label: string
    durationDays: number
  }
}

const formatCurrency = (amount: number, currency = 'FCFA') => {
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

export default function ProductPricing1688({
  productId,
  pricing1688,
  weightKg,
  volumeM3,
  baseCost,
  orderQuantity = 1
}: ProductPricing1688Props) {
  const [selectedMethod, setSelectedMethod] = useState<ShippingMethodId>('air_15')
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if (!pricing1688) return null

  const calculatePrice = async () => {
    if (!pricing1688) return

    setLoading(true)
    try {
      const response = await fetch('/api/pricing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          price1688: pricing1688.price1688,
          baseCost,
          exchangeRate: pricing1688.exchangeRate,
          shippingMethod: selectedMethod,
          weightKg: weightKg || undefined,
          volumeM3: volumeM3 || undefined,
          serviceFeeRate: pricing1688.serviceFeeRate ||,
          orderQuantity 10,
          insuranceRate: pricing1688.insuranceRate || 0
        })
      })

      if (!response.ok) throw new Error('Erreur lors du calcul')
      const data = await response.json()
      setSimulation(data.simulation)
      setShowDetails(true)
    } catch (error) {
      console.error('Erreur simulation:', error)
    } finally {
      setLoading(false)
    }
  }

  const productCostFCFA = pricing1688.price1688 * pricing1688.exchangeRate
// Reset simulation when props change
  useEffect(() => {
    setSimulation(null)
    setShowDetails(false)
  }, [pricing1688, weightKg, volumeM3, baseCost, orderQuantity])

  
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Prix d'origine</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showDetails ? 'Masquer' : 'Détails'}
        </button>
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Prix direct</span>
            <span className="text-lg font-bold text-gray-900">
              {pricing1688.price1688.toLocaleString('fr-FR')} {pricing1688.price1688Currency}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Taux de change</span>
            <span className="text-sm font-medium text-gray-700">
              1 {pricing1688.price1688Currency} = {pricing1688.exchangeRate} FCFA
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Coût produit</span>
              <span className="text-xl font-bold text-blue-600">
                {formatCurrency(productCostFCFA)}
              </span>
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Méthode de transport
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedMethod('air_express')}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedMethod === 'air_express'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                  }`}
                >
                  Express<br />3 jours
                </button>
                <button
                  onClick={() => setSelectedMethod('air_15')}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedMethod === 'air_15'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                  }`}
                >
                  Aérien<br />6-10 jours
                </button>
                <button
                  onClick={() => setSelectedMethod('sea_freight')}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedMethod === 'sea_freight'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                  }`}
                >
                  Maritime<br />50-60 jours
                </button>
              </div>
            </div>

            <button
              onClick={calculatePrice}
              disabled={loading || (!weightKg && !volumeM3)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Calcul en cours...
                </>
              ) : (
                <>
                  <Calculator className="h-5 w-5" />
                  Calculer le prix total
                </>
              )}
            </button>

            {!weightKg && !volumeM3 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <Info className="h-4 w-4 inline mr-2" />
                Veuillez renseigner le poids ou le volume du produit pour calculer le transport.
              </div>
            )}

            {simulation && (
              <div className="space-y-3 mt-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-green-600" />
                    Prix total facturé
                  </h4>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(simulation.breakdown.totalClientPrice, simulation.currency)}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    {simulation.shippingMethod.label} - {simulation.shippingMethod.durationDays} jours
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Détail des coûts</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Coût produit:</span>
                      <span className="font-medium">{formatCurrency(simulation.breakdown.productCostFCFA)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transport:</span>
                      <span className="font-medium">{formatCurrency(simulation.breakdown.shippingCostClient)}</span>
                    </div>
                    {simulation.breakdown.serviceFee > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Frais de service ({pricing1688.serviceFeeRate}%):</span>
                        <span>{formatCurrency(simulation.breakdown.serviceFee)}</span>
                      </div>
                    )}
                    {simulation.breakdown.insuranceFee > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Assurance ({pricing1688.insuranceRate}%):</span>
                        <span>{formatCurrency(simulation.breakdown.insuranceFee)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {simulation.breakdown.netMargin > 0 && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-gray-800">Marge nette</span>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(simulation.breakdown.netMargin)} ({simulation.breakdown.marginPercentage.toFixed(1)}%)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

