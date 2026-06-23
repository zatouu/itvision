'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { heroSlides } from '@/lib/home-data'

const SLIDE_DURATION = 5000

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [pool, setPool] = useState<string[]>([])
  const [broken, setBroken] = useState<Record<string, number>>({})

  // Fetch catalog images on mount
  useEffect(() => {
    let cancelled = false
    fetch('/api/catalog/products?limit=30')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.success && Array.isArray(data.products)) {
          const imgs = data.products
            .map((p: any) => p.image)
            .filter((img: string | undefined) => typeof img === 'string' && img.length > 0)
          if (imgs.length > 0) setPool(shuffle(imgs))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const next = useCallback(() => setCurrent((i) => (i + 1) % heroSlides.length), [])
  const prev = useCallback(() => setCurrent((i) => (i - 1 + heroSlides.length) % heroSlides.length), [])

  useEffect(() => {
    if (hovered) return
    const timer = setInterval(next, SLIDE_DURATION)
    return () => clearInterval(timer)
  }, [hovered, next])

  const slide = heroSlides[current]

  const fallbackImages = slide.images
  const getSrc = (slot: number) => {
    const key = `${current}-${slot}`
    const offset = broken[key] || 0
    if (pool.length > 0) {
      const idx = (current * 3 + slot + offset) % pool.length
      return pool[idx]
    }
    return fallbackImages[slot] || '/file.svg'
  }

  const handleError = (slot: number) => {
    setBroken(prev => ({ ...prev, [`${current}-${slot}`]: (prev[`${current}-${slot}`] || 0) + 1 }))
  }

  return (
    <section
      className="relative w-full overflow-hidden bg-slate-900"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="h-[340px] sm:h-[420px] md:h-[520px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} flex items-center`}
          >
            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between gap-8">
              {/* Text */}
              <div className="max-w-lg text-white">
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl sm:text-3xl md:text-5xl font-extrabold leading-tight mb-4"
                >
                  {slide.title}
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm sm:text-base md:text-lg opacity-90 mb-8"
                >
                  {slide.subtitle}
                </motion.p>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Link
                    href={slide.href}
                    className="inline-flex items-center gap-2 bg-white text-slate-900 px-7 py-3 rounded-full font-bold text-sm hover:bg-slate-50 transition-colors shadow-lg"
                  >
                    {slide.cta}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </div>

              {/* Product collage — large & captivating */}
              <div className="hidden md:flex gap-4 ml-auto items-center shrink-0">
                {getSrc(0) && (
                  <motion.div
                    key={`${current}-hero`}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="w-[180px] h-[320px] lg:w-[240px] lg:h-[400px] rounded-2xl overflow-hidden shadow-2xl bg-white/10 ring-1 ring-white/20"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getSrc(0)}
                      alt=""
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                      onError={() => handleError(0)}
                    />
                  </motion.div>
                )}
                <div className="flex flex-col gap-4">
                  {[1, 2].map((slot) => (
                    <motion.div
                      key={`${current}-${slot}`}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.35 + (slot - 1) * 0.1 }}
                      className="w-[180px] h-[152px] lg:w-[240px] lg:h-[192px] rounded-2xl overflow-hidden shadow-2xl bg-white/10 ring-1 ring-white/20"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getSrc(slot)}
                        alt=""
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                        onError={() => handleError(slot)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 bg-white/5 pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-colors z-20"
          aria-label="Slide précédent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-colors z-20"
          aria-label="Slide suivant"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Pagination dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === current ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
