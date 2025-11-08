'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ShoppingCart, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import type { ShippingOptionPricing } from '@/lib/logistics'

export interface SimilarProductSummary {
  id: string
  name: string
  tagline?: string | null
  category?: string | null
  image?: string | null
  priceAmount?: number | null
  currency?: string | null
  requiresQuote: boolean
  availabilityStatus?: 'in_stock' | 'preorder' | string
  availabilityLabel?: string
  shippingOptions: ShippingOptionPricing[]
  deliveryDays?: number | null
}

interface RelatedProductsProps {
  similar: SimilarProductSummary[]
  productUrl?: string | null
  formatCurrency: (amount?: number | null, currency?: string) => string | null
}

const shippingIcon = (methodId?: string) => {
  const icons = {
    plane: '✈️',
    sea: '🚢',
    truck: '🚚'
  }
  
  if (!methodId) return icons.plane
  if (methodId.includes('sea')) return icons.sea
  if (methodId.includes('truck')) return icons.truck
  return icons.plane
}

const availabilityBadge = (status?: string) => {
  if (status === 'in_stock') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
  if (status === 'preorder') return 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
  return 'bg-slate-500/10 text-slate-200 border border-slate-500/20'
}

export default function RelatedProducts({
  similar,
  productUrl,
  formatCurrency
}: RelatedProductsProps) {
  return (
    <div className="space-y-5">
      {/* Produits similaires */}
      <motion.div
        className="rounded-3xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          Produits similaires
        </h3>
        
        {similar.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nous enrichissons le catalogue pour vous proposer des alternatives ciblées.
          </p>
        ) : (
          <div className="space-y-3">
            {similar.map((item, idx) => {
              const icon = shippingIcon(item.shippingOptions[0]?.id)
              const itemPrice = !item.requiresQuote
                ? formatCurrency(item.priceAmount ?? item.shippingOptions[0]?.total ?? null, item.currency || 'FCFA')
                : null
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                >
                  <Link
                    href={`/produits/${item.id}`}
                    className="group flex gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm p-4 hover:border-emerald-400/50 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300"
                  >
                    <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-slate-800 flex-shrink-0">
                      <Image
                        src={item.image || '/file.svg'}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        sizes="80px"
                      />
                      {/* Badge sur l'image */}
                      <div className="absolute top-1 right-1 text-lg">
                        {icon}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-100 line-clamp-2 group-hover:text-emerald-300 transition-colors">
                        {item.name}
                      </div>
                      <div className="text-xs text-emerald-200 mt-1.5 font-medium">
                        {itemPrice || 'Sur devis'}
                      </div>
                      <div className={clsx(
                        'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold',
                        availabilityBadge(item.availabilityStatus)
                      )}>
                        <span>{item.availabilityLabel || (item.availabilityStatus === 'in_stock' ? 'Stock Dakar' : 'Commande Chine')}</span>
                      </div>
                    </div>
                    
                    <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0 self-center" />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
      
      {/* Produits complémentaires */}
      {similar.length > 0 && (
        <motion.div
          className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/15 backdrop-blur-xl p-6 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Effet de glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 opacity-50 animate-pulse pointer-events-none" />
          
          <div className="relative z-10">
            <h3 className="text-base font-bold text-emerald-200 mb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Produits complémentaires
            </h3>
            <p className="text-xs text-emerald-200/80 mb-4 leading-relaxed">
              Ces produits sont souvent achetés ensemble avec ce produit.
            </p>
            
            <div className="space-y-3">
              {similar.slice(0, 2).map((item, idx) => {
                const itemPrice = !item.requiresQuote
                  ? formatCurrency(item.priceAmount ?? item.shippingOptions[0]?.total ?? null, item.currency || 'FCFA')
                  : null
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                  >
                    <Link
                      href={`/produits/${item.id}`}
                      className="group flex gap-3 rounded-xl border border-emerald-400/30 bg-slate-900/60 backdrop-blur-sm p-3 hover:border-emerald-400/60 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300"
                    >
                      <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-slate-800 flex-shrink-0">
                        <Image
                          src={item.image || '/file.svg'}
                          alt={item.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                          sizes="56px"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-100 line-clamp-2 group-hover:text-emerald-300 transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-emerald-300 mt-1 font-medium">
                          {itemPrice || 'Sur devis'}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Lien fournisseur */}
      {productUrl && (
        <motion.a
          href={productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-3xl border border-emerald-400/30 bg-emerald-500/10 backdrop-blur-sm px-6 py-5 text-sm font-semibold text-emerald-100 hover:border-emerald-300/60 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between">
            <span>Consulter la fiche fournisseur</span>
            <ExternalLink className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
        </motion.a>
      )}
    </div>
  )
}
