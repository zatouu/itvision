'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Shield, CheckCircle, MessageCircle, Phone, ArrowLeft, PackageCheck,
  ShoppingBag, Hash, Ruler, Weight, Tag, ChevronRight, Sparkles, Truck,
  Clock, Star
} from 'lucide-react'
import WhatsAppOrderDrawer from './WhatsAppOrderDrawer'

export interface ProductDetailData {
  id: string
  name: string
  category: string
  description: string
  tagline?: string
  image?: string
  features: string[]
  stockStatus: string
  stockQuantity: number
  stockLabel: string
  priceAmount?: number
  currency: string
  brand?: string
  weight?: string
  dimensions?: string
  model?: string
  warranty?: string
  availabilityLabel: string
  inStock: boolean
  outOfStock: boolean
}

interface Props {
  product: ProductDetailData
}

export default function CorporateProductDetailClient({ product }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openOrderDrawer = () => setDrawerOpen(true)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl flex items-center gap-1 text-sm">
          <a
            href="/corporate-produits"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Catalogue
          </a>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <span className="text-gray-400 truncate max-w-[200px]">{product.category}</span>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 hidden sm:inline" />
          <span className="text-gray-900 dark:text-white font-semibold truncate max-w-[200px] hidden sm:inline">{product.name}</span>
        </div>
      </div>

      {/* Produit */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-5">

          {/* Image */}
          <div className="lg:col-span-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 border border-gray-100 dark:border-slate-800">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-6"
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Shield className="h-24 w-24 text-slate-300 dark:text-slate-700" />
                </div>
              )}
            </div>

            {/* Tags / meta */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {product.brand && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  <Tag className="h-3 w-3" />
                  {product.brand}
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                product.inStock
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : product.outOfStock
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
              }`}>
                <PackageCheck className="h-3 w-3" />
                {product.stockLabel}
              </span>
              {product.warranty && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  <Shield className="h-3 w-3" />
                  Garantie {product.warranty}
                </span>
              )}
            </div>
          </div>

          {/* Infos */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Catégorie */}
            {product.category && (
              <span className="inline-block w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                {product.category}
              </span>
            )}

            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">{product.name}</h1>
              {product.tagline && (
                <p className="mt-1 text-sm font-semibold text-green-700 dark:text-green-300">{product.tagline}</p>
              )}
            </div>

            {/* Prix */}
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-extrabold text-green-600 dark:text-green-400">
                {product.priceAmount !== undefined
                  ? `${Math.round(product.priceAmount).toLocaleString('fr-FR')}`
                  : <span className="text-xl text-gray-400 font-semibold">Prix sur devis</span>
                }
              </div>
              {product.priceAmount !== undefined && (
                <span className="text-sm font-bold text-gray-400">{product.currency}</span>
              )}
            </div>

            {/* Livraison / stock */}
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                <Truck className="h-3.5 w-3.5" />
                Livraison Dakar
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                <Clock className="h-3.5 w-3.5" />
                {product.availabilityLabel}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Description</h2>
                <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">{product.description}</p>
              </div>
            )}

            {/* Features */}
            {product.features.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Caractéristiques principales</h2>
                <ul className="grid gap-2">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specs */}
            {(product.brand || product.weight || product.dimensions || product.model) && (
              <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Fiche technique</h2>
                <dl className="space-y-2.5">
                  {product.brand && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <Tag className="h-3.5 w-3.5" /> Marque
                      </dt>
                      <dd className="text-sm font-bold text-gray-900 dark:text-white">{product.brand}</dd>
                    </div>
                  )}
                  {product.model && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <Hash className="h-3.5 w-3.5" /> Modèle
                      </dt>
                      <dd className="text-sm font-bold text-gray-900 dark:text-white">{product.model}</dd>
                    </div>
                  )}
                  {product.weight && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <Weight className="h-3.5 w-3.5" /> Poids
                      </dt>
                      <dd className="text-sm font-bold text-gray-900 dark:text-white">{product.weight} kg</dd>
                    </div>
                  )}
                  {product.dimensions && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <Ruler className="h-3.5 w-3.5" /> Dimensions
                      </dt>
                      <dd className="text-sm font-bold text-gray-900 dark:text-white">{product.dimensions}</dd>
                    </div>
                  )}
                  {product.warranty && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <Shield className="h-3.5 w-3.5" /> Garantie
                      </dt>
                      <dd className="text-sm font-bold text-gray-900 dark:text-white">{product.warranty}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={openOrderDrawer}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#1ebe5d] transition-colors shadow-lg shadow-green-500/20"
              >
                <ShoppingBag className="h-5 w-5" />
                {product.priceAmount !== undefined
                  ? `Commander sur WhatsApp — ${Math.round(product.priceAmount).toLocaleString('fr-FR')} ${product.currency}`
                  : 'Commander sur WhatsApp (sur devis)'
                }
              </button>
              <a
                href={`/contact?produit=${encodeURIComponent(product.name)}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 transition-colors"
              >
                <Phone className="h-4 w-4" />
                Demander un devis détaillé
              </a>
            </div>

            {/* Aide */}
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 border border-green-100 dark:border-green-800 p-4 mt-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Besoin d&apos;être conseillé ?</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Nos experts évaluent gratuitement vos besoins.</p>
                  <a
                    href={`https://wa.me/221781234567?text=${encodeURIComponent('Bonjour, je souhaite être conseillé pour : ' + product.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-green-700 dark:text-green-400 hover:underline"
                  >
                    <MessageCircle className="h-3 w-3" />
                    Discuter sur WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer WhatsApp */}
      <WhatsAppOrderDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        line={{
          productId: product.id,
          productName: product.name,
          priceAmount: product.priceAmount,
          currency: product.currency,
          image: product.image,
          quantity: 1,
        }}
      />
    </div>
  )
}
