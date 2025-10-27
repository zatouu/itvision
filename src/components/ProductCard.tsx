"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Star, CheckCircle, ShoppingCart } from 'lucide-react'
import { trackEvent } from '@/utils/analytics'

export interface ProductCardProps {
  name: string
  model?: string
  price?: string
  priceAmount?: number
  currency?: string
  requiresQuote?: boolean
  deliveryDays?: number
  features: string[]
  rating: number
  images: string[]
}

export default function ProductCard({ name, model, price, priceAmount, currency = 'Fcfa', requiresQuote, deliveryDays = 0, features, rating, images }: ProductCardProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [adding, setAdding] = useState(false)

  const whatsappUrl = () => {
    const msg = encodeURIComponent(
      `Bonjour, je souhaite un devis pour: ${name}${model ? ` (${model})` : ''}.\nMerci de me recontacter.`
    )
    return `https://wa.me/221774133440?text=${msg}`
  }

  const addToCart = () => {
    try {
      setAdding(true)
      const raw = typeof window !== 'undefined' ? localStorage.getItem('cart:items') : null
      const items = raw ? JSON.parse(raw) : []
      const id = `${name}-${model || ''}`.replace(/\s+/g, '-').toLowerCase()
      const existsIndex = items.findIndex((i: any) => i.id === id)
      if (existsIndex >= 0) items[existsIndex].qty += 1
      else items.push({ id, name: `${name}${model ? ` (${model})` : ''}`, qty: 1, price: priceAmount, currency, requiresQuote: !!requiresQuote })
      localStorage.setItem('cart:items', JSON.stringify(items))
      trackEvent('add_to_cart', { productId: id })
      // notify listeners (e.g., page header/cart icon)
      try {
        window.dispatchEvent(new CustomEvent('cart:updated'))
      } catch {}
      // simple toast
      alert('Produit ajouté au panier')
    } finally {
      setAdding(false)
    }
  }

  const showQuote = typeof requiresQuote === 'boolean' ? requiresQuote : (price ? /devis/i.test(price) : !priceAmount)
  const isBuy = !!priceAmount && !showQuote && (deliveryDays <= 2)
  const isOrder = !!priceAmount && !showQuote && (deliveryDays > 2)
  const primaryCtaLabel = isBuy ? 'Acheter' : isOrder ? 'Commander' : 'Demander un devis'
  const priceLabel = priceAmount && !showQuote ? `${priceAmount.toLocaleString()} ${currency}` : (price || 'Sur devis')

  return (
    <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden group hover:shadow-md transition-all h-full flex flex-col">
      {/* Media */}
      <div className="p-2.5 pb-0">
        <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          <Image
            src={images[activeIndex] || '/file.svg'}
            alt={name}
            fill
            className="object-contain p-3"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            priority={false}
          />
          <div className="absolute top-3 right-3 bg-white/80 backdrop-blur px-2 py-1 rounded-full text-xs font-medium text-gray-700 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" /> {rating.toFixed(1)}
          </div>
        </div>
        {/* Thumbnails */}
        <div className="flex items-center gap-2 mt-2">
          {images.slice(0, 4).map((src, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative h-10 w-10 rounded-md overflow-hidden border ${
                activeIndex === idx ? 'border-emerald-500' : 'border-gray-200'
              }`}
              aria-label={`Image ${idx + 1}`}
            >
              <Image src={src} alt={`${name} ${idx + 1}`} fill className="object-contain" />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col justify-between flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-snug">{name}</h3>
            {model && <p className="text-xs text-gray-500 mt-1">{model}</p>}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">{showQuote ? 'Tarif' : 'Prix'}</div>
            <div className={`text-lg font-bold ${showQuote ? 'text-gray-700' : 'text-emerald-600'}`}>{priceLabel}</div>
          </div>
        </div>

        {/* Features */}
        <ul className="mt-1 space-y-2">
          {features.slice(0, 4).map((f, i) => (
            <li key={i} className="flex items-start text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-4 flex items-center justify-end gap-2">
          {!!priceAmount && !showQuote && (
            <button
              onClick={addToCart}
              disabled={adding}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-semibold shadow"
            >
              <ShoppingCart className="h-4 w-4" /> {adding ? 'Ajout...' : primaryCtaLabel}
            </button>
          )}
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('quote_request', { productId: `${name}-${model || ''}` })}
            className={`inline-flex items-center gap-2 ${showQuote ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-3 py-2 rounded-md text-sm font-semibold`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
            Demander un devis
          </a>
        </div>
      </div>
    </div>
  )
}
