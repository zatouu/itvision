'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

interface PromoProduct {
  id: string
  name: string
  image: string
  price: number
  oldPrice?: number
}

export default function PromoBanner() {
  const [products, setProducts] = useState<PromoProduct[]>([])

  useEffect(() => {
    fetch('/api/catalog/products?limit=6&segment=import&sortBy=default')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const items = (data?.products || data?.items || [])
          .slice(0, 6)
          .map((p: any) => ({
            id: p.id || p._id,
            name: p.name || 'Produit',
            image: p.image || '',
            price: p.pricing?.salePrice || p.price || p.baseCost || 15000,
            oldPrice: p.pricing?.salePrice
              ? Math.round(p.pricing.salePrice * 1.3)
              : p.price
                ? Math.round(p.price * 1.3)
                : undefined,
          }))
          .filter((p: PromoProduct) => p.image && p.image !== '/file.svg')
        setProducts(items)
      })
      .catch(() => {})
  }, [])

  const rotations = [-12, 8, -6, 14, -10, 5]

  return (
    <section className="py-6 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-100"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
            {/* Texte */}
            <div className="p-8 lg:p-12">
              <span className="inline-block bg-black text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                Promo du moment
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2">
                Import groupé en cours
              </h2>
              <p className="text-slate-600 text-lg mb-6">
                Jusqu&apos;à -45% en rejoignant un achat groupé. Livraison Dakar sous 3 jours.
              </p>
              <Link
                href="/achats-groupes"
                className="inline-flex items-center justify-center bg-black text-white px-8 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                Profitez-en maintenant
              </Link>
            </div>

            {/* Images produits en diagonale */}
            <div className="relative h-[280px] lg:h-[320px] overflow-hidden hidden sm:block">
              <div className="absolute inset-0 flex items-center justify-center">
                {products.length > 0 ? (
                  products.slice(0, 4).map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.8, rotate: rotations[i] || 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="absolute shadow-xl rounded-2xl overflow-hidden border-4 border-white"
                      style={{
                        width: i % 2 === 0 ? 140 : 120,
                        height: i % 2 === 0 ? 140 : 120,
                        top: i === 0 ? 20 : i === 1 ? 10 : i === 2 ? 140 : 120,
                        left: i === 0 ? 40 : i === 1 ? 180 : i === 2 ? 20 : 200,
                        transform: `rotate(${rotations[i]}deg)`,
                        zIndex: 4 - i,
                      }}
                    >
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="150px"
                      />
                      {p.oldPrice && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-white font-bold text-sm">
                            {p.price.toLocaleString('fr-FR')} FCFA
                          </p>
                          <p className="text-white/70 text-xs line-through">
                            {p.oldPrice.toLocaleString('fr-FR')} FCFA
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  // Fallback placeholders
                  [0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="absolute shadow-xl rounded-2xl overflow-hidden border-4 border-white"
                      style={{
                        width: i % 2 === 0 ? 140 : 120,
                        height: i % 2 === 0 ? 140 : 120,
                        top: i === 0 ? 20 : i === 1 ? 10 : i === 2 ? 140 : 120,
                        left: i === 0 ? 40 : i === 1 ? 180 : i === 2 ? 20 : 200,
                        transform: `rotate(${rotations[i]}deg)`,
                        zIndex: 4 - i,
                        background: `linear-gradient(135deg, ${['#fbbf24', '#34d399', '#a78bfa', '#fb923c'][i]}40, ${['#f59e0b', '#10b981', '#8b5cf6', '#f97316'][i]}60)`,
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </section>
  )
}
