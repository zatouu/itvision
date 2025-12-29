'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

interface ProductOptionsProps {
  colorOptions: string[]
  variantOptions: string[]
  selectedColor: string | null
  selectedVariant: string | null
  quantity: number
  unitPriceLabel: string | null
  totalPriceLabel: string | null
  onColorChange: (color: string) => void
  onVariantChange: (variant: string) => void
  onQuantityChange: (value: number) => void
}

const colorBadgeStyle = (label: string) => {
  const normalized = label.toLowerCase()
  if (normalized.includes('noir')) return 'bg-gradient-to-br from-slate-800 to-slate-900'
  if (normalized.includes('blanc')) return 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800'
  if (normalized.includes('rouge')) return 'bg-gradient-to-br from-rose-500 to-rose-600'
  if (normalized.includes('bleu')) return 'bg-gradient-to-br from-sky-500 to-blue-600'
  if (normalized.includes('vert')) return 'bg-gradient-to-br from-emerald-500 to-emerald-600'
  if (normalized.includes('gris')) return 'bg-gradient-to-br from-slate-500 to-slate-600'
  return 'bg-gradient-to-br from-purple-500 to-indigo-600'
}

export default function ProductOptions({
  colorOptions,
  variantOptions,
  selectedColor,
  selectedVariant,
  quantity,
  unitPriceLabel,
  totalPriceLabel,
  onColorChange,
  onVariantChange,
  onQuantityChange
}: ProductOptionsProps) {
  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      {/* Couleurs disponibles */}
      {colorOptions.filter(Boolean).length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-bold">Couleurs disponibles</div>
          <div className="flex flex-wrap gap-2">
            {colorOptions.filter(Boolean).map((color, idx) => (
              <motion.button
                key={color}
                type="button"
                onClick={() => onColorChange(color)}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-300 border border-transparent shadow-md',
                  colorBadgeStyle(color),
                  selectedColor === color
                    ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-emerald-400/70 scale-105 shadow-lg shadow-emerald-500/20'
                    : 'opacity-80 hover:opacity-100 hover:scale-105'
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + idx * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="inline-block h-3 w-3 rounded-full bg-white/70 shadow-inner" />
                {color}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Variantes / packs */}
      {variantOptions.filter(Boolean).length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-bold">Variantes / packs</div>
          <div className="flex flex-wrap gap-2">
            {variantOptions.filter(Boolean).map((variant, idx) => (
              <motion.button
                key={variant}
                type="button"
                onClick={() => onVariantChange(variant)}
                className={clsx(
                  'rounded-2xl bg-slate-800/70 backdrop-blur-sm px-4 py-2.5 text-xs font-semibold text-slate-200 border transition-all duration-300',
                  selectedVariant === variant
                    ? 'border-emerald-400/70 text-emerald-200 shadow-lg shadow-emerald-500/20 scale-105 bg-emerald-500/10'
                    : 'border-slate-700 hover:border-emerald-400/50 hover:text-emerald-200 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/10'
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + idx * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {variant}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Quantité et prix */}
      <div className="grid gap-4 sm:grid-cols-[180px,1fr] items-end">
        <div>
          <label htmlFor="quantity-input" className="text-xs uppercase tracking-wider text-slate-500 mb-2 block font-bold">
            Quantité
          </label>
          <input
            id="quantity-input"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => onQuantityChange(Number(e.target.value))}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 backdrop-blur-sm px-4 py-3 text-sm text-slate-100 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition-all"
          />
        </div>
        
        <motion.div
          className="rounded-2xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-sm px-5 py-4 text-sm text-slate-200 flex items-center justify-between hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
          whileHover={{ scale: 1.02 }}
        >
          <div>
            <div className="text-xs text-slate-500 mb-1">Prix unitaire</div>
            <div className="font-semibold text-slate-50 text-base">{unitPriceLabel || 'Sur devis'}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">Total</div>
            <div className="font-bold text-emerald-300 text-lg">{totalPriceLabel || '—'}</div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
