'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { heroSlides } from '@/lib/home-data'

const SLIDE_DURATION = 5000

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [hovered, setHovered] = useState(false)

  const next = useCallback(() => setCurrent((i) => (i + 1) % heroSlides.length), [])
  const prev = useCallback(() => setCurrent((i) => (i - 1 + heroSlides.length) % heroSlides.length), [])

  useEffect(() => {
    if (hovered) return
    const timer = setInterval(next, SLIDE_DURATION)
    return () => clearInterval(timer)
  }, [hovered, next])

  const slide = heroSlides[current]

  return (
    <section
      className="relative w-full overflow-hidden bg-slate-900"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="h-[280px] sm:h-[320px] md:h-[400px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} flex items-center`}
          >
            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
              {/* Text */}
              <div className="max-w-md text-white">
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight mb-3"
                >
                  {slide.title}
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm sm:text-base opacity-90 mb-6"
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
                    className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    {slide.cta}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </div>

              {/* Product grid collage */}
              <div className="hidden md:grid grid-cols-3 gap-3 ml-auto">
                {slide.images.slice(0, 6).map((img, i) => (
                  <motion.div
                    key={`${current}-${i}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="w-[100px] h-[100px] lg:w-[120px] lg:h-[120px] rounded-xl overflow-hidden bg-white/20 shadow-lg"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </motion.div>
                ))}
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
