'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function FinalCTABanner() {
  return (
    <section className="py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-emerald-500 via-violet-500 to-purple-600 px-6 py-10 md:px-12 md:py-14 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Prêt à importer depuis la Chine ?
            </h2>
            <p className="text-sm md:text-base opacity-90 mb-6 max-w-lg mx-auto">
              Rejoignez des milliers de vendeurs et d'acheteurs au Sénégal. Import direct, prix usine, livraison garantie.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/market/creer-compte"
                className="inline-flex items-center justify-center bg-white text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-slate-50 transition-colors"
              >
                Créer un compte
              </Link>
              <Link
                href="/produits"
                className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/30 text-white px-8 py-3 rounded-full font-bold hover:bg-white/20 transition-colors"
              >
                Voir le catalogue
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
