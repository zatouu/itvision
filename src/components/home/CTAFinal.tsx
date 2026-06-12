'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Shield } from 'lucide-react'

export default function CTAFinal() {
  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-violet-600 p-8 sm:p-12 text-white shadow-2xl"
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-10 -mb-10 blur-2xl" />

          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
                Prêt à commander ?
              </h2>
              <p className="text-white/90 text-base max-w-lg">
                Créez votre compte marketplace en 30 secondes et accédez à nos tarifs préférentiels.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Inscription gratuite
                </span>
                <span>·</span>
                <span>Aucun engagement</span>
                <span>·</span>
                <span>Support 7j/7</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-lg"
              >
                Créer un compte
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
