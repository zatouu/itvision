'use client'

import { motion } from 'framer-motion'
import { Star, Rocket, Globe } from 'lucide-react'

const testimonials = [
  {
    name: 'Amadou Diallo',
    role: 'PDG, TechSupplies SN',
    text: 'On a réduit nos coûts d\'import de 40%. La recherche par photo est magique, on trouve des produits qu\'aucun fournisseur local n\'a.',
    rating: 5,
  },
  {
    name: 'Fatima Ndiaye',
    role: 'Responsable achats, SécurPro',
    text: 'Livraison en 3 jours comme promis. Le suivi en temps réel et le support réactif nous rassurent à chaque commande.',
    rating: 5,
  },
  {
    name: 'Omar Sow',
    role: 'Entrepreneur, Dakar',
    text: 'J\'ai importé 200 caméras IP via un achat groupé. J\'ai payé 30% moins cher que mon ancien fournisseur français.',
    rating: 5,
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < count ? 'text-emerald-400 fill-emerald-400' : 'text-slate-200'}`}
        />
      ))}
    </div>
  )
}

export default function SocialProofSection() {
  return (
    <section className="py-20 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Logos partenaires */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-8">
            Ils nous font confiance
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {['Hikvision', 'Dahua', 'Uniview'].map((brand) => (
              <div
                key={brand}
                className="w-28 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-sm tracking-wide"
              >
                {brand}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Témoignages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
              className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800"
            >
              <StarRating count={t.rating} />
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-violet-400 flex items-center justify-center text-white font-bold text-sm">
                  {t.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-center"
        >
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">1200+ commandes livrées</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">4.8/5 satisfaction</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Tout le Sénégal</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
