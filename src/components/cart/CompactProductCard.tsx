'use client'

import { useRouter } from 'next/navigation'
import { Package, ShoppingCart, Star } from 'lucide-react'
import { motion } from 'framer-motion'

interface CompactProductCardProps {
  product: any
  onAdd: (product: any) => void
}

const formatCurrency = (v?: number) =>
  typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-'

export default function CompactProductCard({ product, onAdd }: CompactProductCardProps) {
  const router = useRouter()

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col h-full">
      <div
        className="relative h-28 bg-slate-100 overflow-hidden cursor-pointer"
        onClick={() => router.push(`/produits/${product._id}`)}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Package className="w-8 h-8" />
          </div>
        )}
        {product.isFeatured && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" /> Top
          </span>
        )}
      </div>
      <div className="p-2.5 flex flex-col flex-1">
        <h3 className="text-xs font-semibold text-slate-900 line-clamp-2 min-h-[2.5em] cursor-pointer" onClick={() => router.push(`/produits/${product._id}`)}>
          {product.name}
        </h3>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-ddm-emerald">{formatCurrency(product.price)}</span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onAdd(product)}
            className="w-7 h-7 rounded-lg bg-ddm-emerald text-white flex items-center justify-center hover:bg-ddm-emerald-dark transition"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
