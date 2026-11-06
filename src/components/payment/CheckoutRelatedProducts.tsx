'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, ShoppingBag, Sparkles, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Product {
  _id: string
  name: string
  image?: string
  price?: number
  b2bPrice?: number
}

const formatCurrency = (v?: number) =>
  typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : ''

export default function CheckoutRelatedProducts({ productIds }: { productIds?: string[] }) {
  const [products, setProducts] = useState<Product[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/catalog/products?limit=8&sort=popular')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.items) {
          const filtered = data.items.filter(
            (p: Product) => !productIds?.includes(p._id)
          )
          setProducts(filtered.slice(0, 6))
        }
      })
      .catch(() => {})
  }, [])

  const addToCart = useCallback((product: Product) => {
    try {
      const raw = localStorage.getItem('cart:items')
      const items: any[] = raw ? JSON.parse(raw) : []
      const exists = items.find(i => i.id === product._id)
      if (exists) {
        exists.qty = (exists.qty || 1) + 1
      } else {
        items.push({
          id: product._id,
          name: product.name,
          image: product.image,
          price: product.price || 0,
          b2bPrice: product.b2bPrice,
          qty: 1
        })
      }
      localStorage.setItem('cart:items', JSON.stringify(items))
      window.dispatchEvent(new CustomEvent('cart:updated'))
      setAdded(prev => new Set(prev).add(product._id))
      setTimeout(() => {
        setAdded(prev => {
          const next = new Set(prev)
          next.delete(product._id)
          return next
        })
      }, 2000)
    } catch {}
  }, [])

  if (products.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-green-500 to-violet-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Complétez votre commande</h3>
            <p className="text-xs text-gray-500">Ajoutez un produit pendant que vous payez</p>
          </div>
        </div>
        <Link
          href="/produits"
          className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1 transition"
        >
          Voir tout
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {products.map((product, idx) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all group"
          >
            <div className="relative h-28 bg-gray-100 overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-gray-300" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-2 leading-snug">
                {product.name}
              </p>
              <div className="flex items-center justify-between gap-1">
                <div>
                  <p className="text-xs font-bold text-green-600">
                    {formatCurrency(product.price)}
                  </p>
                  {product.b2bPrice && product.b2bPrice < (product.price ?? Infinity) && (
                    <p className="text-[10px] text-violet-500">
                      Vol: {formatCurrency(product.b2bPrice)}
                    </p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => addToCart(product)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition font-bold text-sm ${
                    added.has(product._id)
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-green-500 to-violet-500 text-white hover:from-green-600 hover:to-violet-600'
                  }`}
                >
                  {added.has(product._id) ? '✓' : <Plus className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/panier"
          className="text-sm text-green-600 hover:text-green-700 font-semibold transition"
        >
          → Voir le panier mis à jour
        </Link>
      </div>
    </motion.div>
  )
}
