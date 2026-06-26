'use client'

import { Minus, Plus, Trash2, Heart, Users } from 'lucide-react'
import { motion } from 'framer-motion'

interface CartItemCardProps {
  item: any
  selected: boolean
  onToggle: () => void
  onQtyChange: (qty: number) => void
  onRemove: () => void
  onAddToFavorites?: () => void
  onGroupBuy?: () => void
}

const formatCurrency = (v?: number) =>
  typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-'

export default function CartItemCard({
  item,
  selected,
  onToggle,
  onQtyChange,
  onRemove,
  onAddToFavorites,
  onGroupBuy,
}: CartItemCardProps) {
  const qty = item.qty || 1
  const price = item.price || 0
  const total = price * qty

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-xl p-3 flex gap-3"
    >
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 accent-ddm-emerald rounded"
        />
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No img</div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 break-words">{item.name}</h3>
          <p className="text-xs text-slate-500 mt-1 truncate">
            Couleur: {item.color || 'Défaut'} · Taille: {item.size || 'Standard'}
          </p>
          <p className="text-xs text-slate-500 truncate">Vendu par {item.shopName || 'DDM+ Import'}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {item.groupActive && (
              <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-medium rounded flex items-center gap-1">
                <Users className="w-3 h-3" /> Groupe actif
              </span>
            )}
            {item.stockStatus === 'low' && (
              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-medium rounded">
                Stock faible
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onQtyChange(Math.max(1, qty - 1))}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-medium">{qty}</span>
            <button
              onClick={() => onQtyChange(qty + 1)}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-right min-w-0">
            <p className="text-sm font-bold text-ddm-emerald whitespace-nowrap">{formatCurrency(total)}</p>
            {qty > 1 && <p className="text-[10px] text-slate-400 whitespace-nowrap">{formatCurrency(price)} / unité</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 border-l border-slate-100 pl-3 flex-shrink-0">
        {onAddToFavorites && (
          <button onClick={onAddToFavorites} className="p-1.5 text-slate-400 hover:text-red-500 transition">
            <Heart className="w-4 h-4" />
          </button>
        )}
        {onGroupBuy && (
          <button onClick={onGroupBuy} className="p-1.5 text-violet-500 hover:text-violet-700 transition" title="Acheter en groupe">
            <Users className="w-4 h-4" />
          </button>
        )}
        <button onClick={onRemove} className="p-1.5 text-slate-400 hover:text-red-600 transition">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}
