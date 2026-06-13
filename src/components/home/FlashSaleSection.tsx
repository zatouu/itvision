'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { flashSaleProducts, flashSaleEndTime } from '@/lib/home-data'

function CountdownTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState({ h: 2, m: 34, s: 18 })

  useEffect(() => {
    const end = new Date(endTime).getTime()
    const tick = () => {
      const diff = Math.max(0, end - Date.now())
      setTimeLeft({
        h: Math.floor(diff / (1000 * 60 * 60)),
        m: Math.floor((diff / (1000 * 60)) % 60),
        s: Math.floor((diff / 1000) % 60),
      })
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [endTime])

  const pad = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="flex items-center gap-1.5">
      {(['h', 'm', 's'] as const).map((k, i) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center text-xs font-bold font-mono">
            {pad(timeLeft[k])}
          </span>
          {i < 2 && <span className="text-white/60">:</span>}
        </span>
      ))}
    </div>
  )
}

function formatPrice(price: number, currency: string) {
  return `${price.toLocaleString('fr-FR')} ${currency}`
}

export default function FlashSaleSection() {
  return (
    <section className="py-6 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg">⚡ Vente Flash</h2>
            <CountdownTimer endTime={flashSaleEndTime} />
          </div>
          <Link href="/flash-sale" className="text-sm underline hover:text-white/80 transition">
            Voir tout →
          </Link>
        </div>

        {/* Horizontal scroll products */}
        <div className="bg-slate-50 border border-slate-100 border-t-0 rounded-b-2xl p-4">
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
            {flashSaleProducts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className="snap-start flex-shrink-0 w-[160px] bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-[160px]">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {p.badges?.map((b) => (
                    <span
                      key={b}
                      className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
                    >
                      {b}
                    </span>
                  ))}
                </div>
                <div className="p-2.5">
                  <h3 className="text-xs font-medium text-slate-800 line-clamp-2 mb-1.5 min-h-[2rem]">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm font-bold text-red-500">
                      {formatPrice(p.price, p.currency)}
                    </span>
                    {p.originalPrice && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatPrice(p.originalPrice, p.currency)}
                      </span>
                    )}
                  </div>
                  {/* Stock bar */}
                  {p.stockLeft && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${Math.max(10, (p.stockLeft / 50) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-red-500 font-medium">
                        Plus que {p.stockLeft} !
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
