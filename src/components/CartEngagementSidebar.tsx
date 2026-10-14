'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Users, ShoppingBag, TrendingUp, Sparkles } from 'lucide-react'
import type { MarketplaceTier } from '@/lib/pricing/resolve-product-price'

interface Product {
  _id: string
  name: string
  image?: string
  price?: number
  b2bPrice?: number
}

interface GroupOrder {
  _id: string
  title: string
  targetQty: number
  currentQty: number
  deadline?: string
  image?: string
}

const formatCurrency = (v?: number) =>
  typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : ''

export default function CartEngagementSidebar({
  cartProductIds = [],
  marketplaceTier = 'standard',
}: {
  cartProductIds?: string[]
  marketplaceTier?: MarketplaceTier
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [groups, setGroups] = useState<GroupOrder[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())
  const isWholesaleAccount = marketplaceTier !== 'standard'

  useEffect(() => {
    fetch('/api/catalog/products?limit=5&sort=popular')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.items) {
          setProducts(d.items.filter((p: Product) => !cartProductIds.includes(p._id)).slice(0, 4))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/group-orders?status=active&limit=3')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.groups || d?.items) setGroups((d.groups || d.items || []).slice(0, 2))
      })
      .catch(() => {})
  }, [])

  const addToCart = (product: Product) => {
    try {
      const raw = localStorage.getItem('cart:items')
      const items: any[] = raw ? JSON.parse(raw) : []
      const exists = items.find(i => i.id === product._id)
      if (exists) {
        exists.qty = (exists.qty || 1) + 1
      } else {
        items.push({ id: product._id, name: product.name, image: product.image, price: product.price || 0, b2bPrice: product.b2bPrice, qty: 1 })
      }
      localStorage.setItem('cart:items', JSON.stringify(items))
      window.dispatchEvent(new CustomEvent('cart:updated'))
      setAdded(prev => new Set(prev).add(product._id))
      setTimeout(() => setAdded(prev => { const n = new Set(prev); n.delete(product._id); return n }), 2000)
    } catch {}
  }

  if (products.length === 0 && groups.length === 0) return null

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="w-60 flex-shrink-0 space-y-4"
    >
      {/* Produits suggérés */}
      {products.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-green-500 to-violet-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Vous aimerez</span>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {products.map(product => (
              <div key={product._id} className="flex items-center gap-2 group hover:bg-gray-50 rounded-xl p-1.5 transition">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                  {product.image
                    ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-gray-300" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-1">{product.name}</p>
                  <p className="text-xs text-green-600 font-bold">{formatCurrency(product.price)}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => addToCart(product)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white transition ${
                    added.has(product._id) ? 'bg-green-500' : 'bg-gradient-to-r from-green-500 to-violet-500 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {added.has(product._id) ? '✓' : <Plus className="w-3.5 h-3.5" />}
                </motion.button>
              </div>
            ))}
          </div>
          <div className="px-4 pb-3">
            <Link href="/produits" className="text-xs text-violet-600 hover:text-violet-700 font-semibold transition">
              Voir tout le catalogue →
            </Link>
          </div>
        </div>
      )}

      {/* Groupes actifs */}
      {groups.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-violet-500 to-violet-600 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Groupes actifs</span>
            </div>
          </div>
          <div className="p-3 space-y-3">
            {groups.map(g => {
              const pct = g.targetQty > 0 ? Math.min((g.currentQty / g.targetQty) * 100, 100) : 0
              return (
                <Link key={g._id} href={`/achats-groupes/${g._id}`} className="block hover:bg-gray-50 rounded-xl p-2 transition">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-1 mb-1.5">{g.title}</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-violet-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500">{g.currentQty}/{g.targetQty} participants</p>
                </Link>
              )
            })}
          </div>
          <div className="px-4 pb-3">
            <Link href="/achats-groupes" className="text-xs text-violet-600 hover:text-violet-700 font-semibold transition">
              Voir tous les groupes →
            </Link>
          </div>
        </div>
      )}

      {/* Bloc engagement */}
      <div className="bg-gradient-to-br from-green-50 to-violet-50 rounded-2xl border border-green-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="text-xs font-bold text-gray-700">Prix B2B</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          {isWholesaleAccount ? (
            <>
              Votre compte bénéficie déjà des <span className="font-bold text-violet-700">prix B2B dès 1 unité</span> (si disponibles).
            </>
          ) : (
            <>
              Ajoutez <span className="font-bold text-violet-700">5+ produits</span> pour débloquer les prix B2B selon les offres produit.
            </>
          )}
        </p>
      </div>
    </motion.aside>
  )
}
