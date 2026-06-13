'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Store, Wrench, ShieldCheck, Camera, Zap, ArrowRight } from 'lucide-react'

const PACKS = [
  {
    icon: Store,
    name: 'Pack Boutique',
    desc: 'Pack complet pour ouvrir votre boutique de matériel électronique',
    items: ['10 caméras IP', '5 enregistreurs NVR', 'Câbles & accessoires'],
    price: '2 450 000',
    color: 'bg-emerald-50 text-emerald-600',
    href: '/produits?pack=boutique',
  },
  {
    icon: Camera,
    name: 'Pack Revendeur CCTV',
    desc: 'Idéal pour les revendeurs de systèmes de surveillance',
    items: ['20 caméras', '8 switch PoE', 'Accessoires de montage'],
    price: '3 890 000',
    color: 'bg-blue-50 text-blue-600',
    href: '/produits?pack=revendeur',
  },
  {
    icon: Wrench,
    name: 'Pack Installateur',
    desc: 'Tout le matériel nécessaire pour les installations sur le terrain',
    items: ['Câbles & connectique', 'Outillage', 'Testeur réseau'],
    price: '1 250 000',
    color: 'bg-orange-50 text-orange-600',
    href: '/produits?pack=installateur',
  },
  {
    icon: Zap,
    name: 'Pack Électricien',
    desc: 'Matériel électrique et domotique pour installations modernes',
    items: ['Disjoncteurs', 'Domotique', 'Énergie solaire'],
    price: '1 780 000',
    color: 'bg-amber-50 text-amber-600',
    href: '/produits?pack=electricien',
  },
]

export default function BusinessPacks() {
  return (
    <section className="py-12 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-slate-200/50 rounded-full px-4 py-1.5 text-sm font-semibold text-slate-700 mb-3">
            <ShieldCheck className="h-4 w-4" />
            Acheter pour revendre
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Packs professionnels
          </h2>
          <p className="text-slate-500 mt-1">
            Des lots pré-assemblés pour les revendeurs, installateurs et boutiques
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PACKS.map((pack, idx) => {
            const Icon = pack.icon
            return (
              <motion.div
                key={pack.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl ${pack.color} flex items-center justify-center mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="font-bold text-slate-900 mb-1">{pack.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{pack.desc}</p>

                <ul className="space-y-1.5 mb-4">
                  {pack.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="w-1 h-1 rounded-full bg-slate-400" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400">À partir de</span>
                    <div className="text-lg font-bold text-slate-900">{pack.price} FCFA</div>
                  </div>
                  <Link
                    href={pack.href}
                    className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Voir
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
