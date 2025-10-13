"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Star, CheckCircle, ShoppingCart, Eye } from 'lucide-react'

export interface ProductCardProps {
  name: string
  model?: string
  price: string
  features: string[]
  rating: number
  images: string[]
}

export default function ProductCard({ name, model, price, features, rating, images }: ProductCardProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const whatsappUrl = () => {
    const msg = encodeURIComponent(
      `Bonjour, je souhaite un devis pour: ${name}${model ? ` (${model})` : ''}.\nMerci de me recontacter.`
    )
    return `https://wa.me/221774133440?text=${msg}`
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden group hover:shadow-xl transition-all">
      {/* Media */}
      <div className="p-3 pb-0">
        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          <Image
            src={images[activeIndex] || '/file.svg'}
            alt={name}
            fill
            className="object-contain p-6"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            priority={false}
          />
          <div className="absolute top-3 right-3 bg-white/80 backdrop-blur px-2 py-1 rounded-full text-xs font-medium text-gray-700 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" /> {rating.toFixed(1)}
          </div>
        </div>
        {/* Thumbnails */}
        <div className="flex items-center gap-2 mt-3">
          {images.slice(0, 4).map((src, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative h-12 w-12 rounded-lg overflow-hidden border ${
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
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-snug">{name}</h3>
            {model && <p className="text-sm text-gray-500 mt-1">{model}</p>}
          </div>
        </div>

        {/* Features */}
        <ul className="mt-4 space-y-2">
          {features.slice(0, 4).map((f, i) => (
            <li key={i} className="flex items-start text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Tarif</div>
            <div className="text-xl font-bold text-emerald-600">{price}</div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow"
            >
              <ShoppingCart className="h-4 w-4" /> Demander un devis
            </a>
            <button
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm"
              onClick={() => setActiveIndex((activeIndex + 1) % images.length)}
            >
              <Eye className="h-4 w-4" /> Voir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
