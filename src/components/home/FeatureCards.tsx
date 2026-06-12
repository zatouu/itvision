'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Search, Users, Factory, ArrowRight, Sparkles } from 'lucide-react'

interface FeatureCardsProps {
  onOpenSourcing?: () => void
}

export default function FeatureCards({ onOpenSourcing }: FeatureCardsProps) {
  return (
    <section className="py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-4">
            Tout ce dont vous avez besoin pour importer
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Trois services puissants, une seule plateforme.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Carte 1 — Trouvez-moi ce produit (PHARE) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="md:col-span-1"
          >
            <motion.div
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              animate={{
                boxShadow: [
                  '0 0 40px rgba(124,58,237,0.15)',
                  '0 0 60px rgba(124,58,237,0.25)',
                  '0 0 40px rgba(124,58,237,0.15)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="relative h-[520px] rounded-3xl overflow-hidden border-2 border-violet-200 ring-4 ring-violet-100 bg-white flex flex-col"
            >
              {/* Badge populaire */}
              <div className="absolute top-4 right-4 z-10">
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                  <Sparkles className="h-3 w-3" />
                  Le plus populaire
                </span>
              </div>

              {/* Image top (60%) */}
              <div className="relative h-[60%] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-100 via-purple-50 to-violet-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-violet-300 to-purple-400 flex items-center justify-center shadow-lg mb-3">
                      <Search className="h-12 w-12 text-white" />
                    </div>
                    <p className="text-violet-600 font-semibold text-sm">Recherche par photo</p>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
              </div>

              {/* Content bottom */}
              <div className="flex-1 p-6 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-3">
                  <Search className="h-5 w-5 text-violet-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  Trouvez un produit rare en Chine
                </h3>
                <p className="text-sm text-slate-500 mb-4 flex-1">
                  Envoyez une photo, notre IA + nos sourceurs trouvent le produit en 24h.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-violet-50 text-violet-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                    Recherche par photo
                  </span>
                  <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                    Réponse sous 24h
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenSourcing}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-violet-200"
                >
                  Essayer maintenant
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>

          {/* Carte 2 — Achats Groupés */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="md:col-span-1"
          >
            <motion.div
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className="h-[520px] rounded-3xl overflow-hidden border border-emerald-200 bg-white flex flex-col shadow-lg"
            >
              {/* Image top (60%) */}
              <div className="relative h-[60%] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-300 to-green-400 flex items-center justify-center shadow-lg mb-3">
                      <Users className="h-12 w-12 text-white" />
                    </div>
                    <p className="text-emerald-600 font-semibold text-sm">Groupe d&apos;acheteurs</p>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
              </div>

              {/* Content bottom */}
              <div className="flex-1 p-6 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  Achetez à plusieurs
                </h3>
                <p className="text-sm text-slate-500 mb-4 flex-1">
                  Regroupez-vous avec d&apos;autres acheteurs et économisez jusqu&apos;à -45%.
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-400 flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">JD</div>
                    <div className="w-7 h-7 rounded-full bg-violet-400 flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">AM</div>
                    <div className="w-7 h-7 rounded-full bg-emerald-300 flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">SK</div>
                  </div>
                  <span className="text-xs text-slate-500">
                    847 membres actifs · 12 groupes ouverts
                  </span>
                </div>
                <Link
                  href="/achats-groupes"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-200"
                >
                  Rejoindre un groupe
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </motion.div>

          {/* Carte 3 — Sourcing Direct */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="md:col-span-1"
          >
            <motion.div
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className="h-[520px] rounded-3xl overflow-hidden border border-slate-200 bg-white flex flex-col shadow-lg"
            >
              {/* Image top (60%) */}
              <div className="relative h-[60%] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-lg mb-3">
                      <Factory className="h-12 w-12 text-white" />
                    </div>
                    <p className="text-slate-600 font-semibold text-sm">Direct usine Chine</p>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
              </div>

              {/* Content bottom */}
              <div className="flex-1 p-6 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <Factory className="h-5 w-5 text-slate-700" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  Sourcing direct usine
                </h3>
                <p className="text-sm text-slate-500 mb-4 flex-1">
                  Prix transparents, zéro intermédiaire. Vous payez le prix usine.
                </p>
                <div className="mb-4">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                    Marge fixe +15% seulement
                  </span>
                </div>
                <Link
                  href="/sourcing"
                  className="w-full inline-flex items-center justify-center gap-2 border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white py-3 rounded-xl font-semibold transition-all"
                >
                  Demander un devis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
