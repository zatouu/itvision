'use client'

import { Truck } from 'lucide-react'

interface PriceBreakdownProps {
  subtotal: number
  serviceFees?: number
  transport: number
  insurance?: number
  promoDiscount?: number
  grainsDiscount?: number
  total: number
  totalSavings?: number
}

const formatCurrency = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`

export default function PriceBreakdown({
  subtotal,
  serviceFees = 0,
  transport,
  insurance = 0,
  promoDiscount = 0,
  grainsDiscount = 0,
  total,
  totalSavings = 0,
}: PriceBreakdownProps) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-slate-600">
        <span>Sous-total</span>
        <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
      </div>
      {serviceFees > 0 && (
        <div className="flex justify-between text-slate-600">
          <span>Frais de service</span>
          <span className="font-medium text-slate-900">+ {formatCurrency(serviceFees)}</span>
        </div>
      )}
      <div className="flex justify-between text-slate-600">
        <span className="flex items-center gap-1">
          <Truck className="w-3.5 h-3.5 text-ddm-orange" />
          Transport
        </span>
        <span className="font-medium text-slate-900">+ {formatCurrency(transport)}</span>
      </div>
      {insurance > 0 && (
        <div className="flex justify-between text-slate-600">
          <span>Assurance</span>
          <span className="font-medium text-slate-900">+ {formatCurrency(insurance)}</span>
        </div>
      )}
      {promoDiscount > 0 && (
        <div className="flex justify-between text-ddm-purple">
          <span>Code promo</span>
          <span className="font-medium">- {formatCurrency(promoDiscount)}</span>
        </div>
      )}
      {grainsDiscount > 0 && (
        <div className="flex justify-between text-amber-600">
          <span>Grains DDM+</span>
          <span className="font-medium">- {formatCurrency(grainsDiscount)}</span>
        </div>
      )}
      {totalSavings > 0 && (
        <div className="flex justify-between text-xs text-ddm-emerald">
          <span>Économies totales</span>
          <span className="font-medium">{formatCurrency(totalSavings)} (-13%)</span>
        </div>
      )}
      <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
        <span className="text-base font-bold text-slate-900">Total estimé</span>
        <span className="text-xl font-bold text-ddm-emerald">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
