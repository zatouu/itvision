'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

interface PromoSlideData {
  _id: string
  title: string
  subtitle?: string
  ctaText: string
  ctaLink: string
  bgColor?: string
  accentColor?: string
  textColor?: string
  images?: string[]
}

const FALLBACK_SLIDES: PromoSlideData[] = [
  {
    _id: 'fallback-1',
    title: 'Import groupé en cours',
    subtitle: 'Jusqu\'à -45% en rejoignant un achat groupé. Livraison Dakar sous 3 jours.',
    ctaText: 'Profitez-en maintenant',
    ctaLink: '/achats-groupes',
    bgColor: 'from-amber-50 via-yellow-50 to-orange-50',
    accentColor: 'bg-black',
    textColor: 'text-slate-900',
    images: [],
  },
  {
    _id: 'fallback-2',
    title: 'Nouveautés tech importées',
    subtitle: 'Les derniers produits arrivés de Chine. Prix usine garantis.',
    ctaText: 'Découvrir',
    ctaLink: '/produits?segment=import',
    bgColor: 'from-emerald-50 via-green-50 to-teal-50',
    accentColor: 'bg-emerald-600',
    textColor: 'text-slate-900',
    images: [],
  },
  {
    _id: 'fallback-3',
    title: 'Vous cherchez un produit ?',
    subtitle: 'Envoyez-nous une photo, nous le trouvons pour vous sous 24h.',
    ctaText: 'Essayer',
    ctaLink: '/produits#sourcing',
    bgColor: 'from-violet-50 via-purple-50 to-fuchsia-50',
    accentColor: 'bg-violet-600',
    textColor: 'text-slate-900',
    images: [],
  },
]

const rotations = [-12, 8, -6, 14]

export default function PromoBanner() {
  const [slides, setSlides] = useState<PromoSlideData[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/promo-slides')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const items = data?.slides || []
        setSlides(items.length > 0 ? items : FALLBACK_SLIDES)
        setLoading(false)
      })
      .catch(() => {
        setSlides(FALLBACK_SLIDES)
        setLoading(false)
      })
  }, [])

  const nextSlide = useCallback(() => {
    setSlides((prev) => {
      setCurrent((i) => (i + 1) % prev.length)
      return prev
    })
  }, [])

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(nextSlide, 5000)
    return () => clearInterval(timer)
  }, [slides.length, nextSlide])

  const active = slides[current] || FALLBACK_SLIDES[0]

  if (loading) {
    return (
      <section className="py-6 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-slate-100 animate-pulse h-[320px]" />
        </div>
      </section>
    )
  }

  return (
    <section className="py-6 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={active._id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5 }}
              className={`relative bg-gradient-to-r ${active.bgColor || 'from-amber-50 via-yellow-50 to-orange-50'} border border-amber-100`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
                {/* Texte */}
                <div className="p-8 lg:p-12">
                  <span className={`inline-block ${active.accentColor || 'bg-black'} text-white text-xs font-bold px-3 py-1 rounded-full mb-4`}>
                    Promo du moment
                  </span>
                  <h2 className={`text-3xl sm:text-4xl font-extrabold ${active.textColor || 'text-slate-900'} mb-2`}>
                    {active.title}
                  </h2>
                  {active.subtitle && (
                    <p className="text-slate-600 text-lg mb-6">
                      {active.subtitle}
                    </p>
                  )}
                  <Link
                    href={active.ctaLink || '/produits'}
                    className="inline-flex items-center justify-center bg-black text-white px-8 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                  >
                    {active.ctaText || 'En savoir plus'}
                  </Link>
                </div>

                {/* Images produits en diagonale */}
                <div className="relative h-[280px] lg:h-[320px] overflow-hidden hidden sm:block">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {(active.images && active.images.length > 0)
                      ? active.images.slice(0, 4).map((src, i) => (
                          <motion.div
                            key={src}
                            initial={{ opacity: 0, scale: 0.8, rotate: rotations[i] || 0 }}
                            animate={{ opacity: 1, scale: 1, rotate: rotations[i] || 0 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="absolute shadow-xl rounded-2xl overflow-hidden border-4 border-white"
                            style={{
                              width: i % 2 === 0 ? 140 : 120,
                              height: i % 2 === 0 ? 140 : 120,
                              top: i === 0 ? 20 : i === 1 ? 10 : i === 2 ? 140 : 120,
                              left: i === 0 ? 40 : i === 1 ? 180 : i === 2 ? 20 : 200,
                              zIndex: 4 - i,
                            }}
                          >
                            <Image
                              src={src}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="150px"
                            />
                          </motion.div>
                        ))
                      : [0, 1, 2, 3].map((i) => (
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
                        ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          {slides.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === current ? 'bg-black w-6' : 'bg-black/30 hover:bg-black/50'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
