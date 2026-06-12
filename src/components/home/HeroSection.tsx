'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Truck, Package, Percent, ArrowRight, Play } from 'lucide-react'
import HeroProductGrid from './HeroProductGrid'

export default function HeroSection() {
  return (
    <section className="relative min-h-[70vh] w-full overflow-hidden bg-white">
      {/* Glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-emerald-200/40 to-violet-200/40 blur-3xl" />
        <div className="absolute -right-20 top-20 h-[300px] w-[300px] rounded-full bg-emerald-100/30 blur-[80px]" />
        <div className="absolute left-20 bottom-10 h-[250px] w-[250px] rounded-full bg-violet-100/30 blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-[60vh]">
          {/* Colonne gauche — Texte */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="order-2 lg:order-1"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-sm font-semibold text-emerald-700 mb-6">
              <span className="text-base">✨</span>
              Marketplace #1 Sénégal
            </div>

            {/* Titre */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
              <span className="block">
                L&apos;import{' '}
                <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                  simplifié
                </span>
                .
              </span>
            </h1>

            {/* Sous-titre */}
            <p className="mt-6 text-lg text-slate-500 max-w-md">
              De la Chine à Dakar en 3 jours. Sans intermédiaires.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/produits"
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5"
                aria-label="Explorer le catalogue de produits"
              >
                Explorer le catalogue
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="#comment-ca-marche"
                className="inline-flex items-center justify-center gap-2 border-2 border-violet-600 text-violet-600 hover:bg-violet-50 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
                aria-label="Voir comment ça marche"
              >
                <Play className="h-4 w-4 fill-current" />
                Comment ça marche
              </Link>
            </div>

            {/* Mini stats */}
            <div className="mt-10 flex flex-wrap items-center gap-6 sm:gap-8">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="font-semibold">3 jours</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
                  <Package className="h-5 w-5 text-violet-600" />
                </div>
                <span className="font-semibold">1200+ produits</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Percent className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="font-semibold">-30% en groupe</span>
              </div>
            </div>
          </motion.div>

          {/* Colonne droite — Visuel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="order-1 lg:order-2 relative"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Grille produits dynamiques du catalogue */}
              <HeroProductGrid />

              {/* Carte flottante 1 — Notification commande */}
              <motion.div
                animate={{
                  y: [0, -6, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 sm:top-2 sm:right-0 lg:-right-8 bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Nouvelle commande</p>
                    <p className="text-[10px] text-slate-500">Il y a 2 min</p>
                  </div>
                </div>
              </motion.div>

              {/* Carte flottante 2 — Prix */}
              <motion.div
                animate={{
                  y: [0, 6, 0],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -left-4 sm:bottom-4 sm:left-0 lg:-left-8 bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <span className="text-violet-600 text-sm font-bold">₣</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">15 000 FCFA</p>
                    <p className="text-[10px] text-slate-500">À partir de</p>
                  </div>
                </div>
              </motion.div>

              {/* Carte flottante 3 — Badge certifié */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-xl border border-white/40 shadow-lg rounded-full px-4 py-2"
              >
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-bold text-slate-800">Hikvision certifié</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
