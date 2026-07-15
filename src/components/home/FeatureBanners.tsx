'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const features = [
  {
    title: '📸 Trouvez-moi ce produit',
    subtitle: 'Photo → résultat 24h',
    badge: 'IA + Sourcing humain',
    cta: 'Essayer',
    href: '/trouver-pour-moi',
    gradient: 'from-violet-600 to-purple-700',
  },
  {
    title: '🤝 Achats Groupés',
    subtitle: 'Jusqu\'à -45% en groupe',
    badge: 'Membres actifs',
    cta: 'Rejoindre',
    href: '/achats-groupes',
    gradient: 'from-emerald-500 to-green-600',
  },
  {
    title: '🏭 Sourcing Direct',
    subtitle: 'Prix usine garanti',
    badge: 'Marge fixe +15%',
    cta: 'Devis 24h',
    href: '/sourcing',
    gradient: 'from-blue-600 to-indigo-700',
  },
]

export default function FeatureBanners() {
  return (
    <section className="pb-8 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Link href={f.href} className={`block relative h-[180px] md:h-[200px] rounded-2xl overflow-hidden group shadow-sm hover:shadow-lg transition-shadow bg-gradient-to-r ${f.gradient}`}>
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 bg-white/5 pointer-events-none" />
                {/* Content */}
                <div className="relative z-10 p-5 h-full flex flex-col justify-between text-white">
                  <div>
                    <span className="inline-block bg-white/20 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
                      {f.badge}
                    </span>
                    <h3 className="font-bold text-lg leading-tight">{f.title}</h3>
                    <p className="text-sm opacity-90 mt-1">{f.subtitle}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold bg-white text-slate-900 px-4 py-2 rounded-full w-fit group-hover:bg-emerald-400 transition-colors">
                    {f.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
