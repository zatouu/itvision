'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Camera, Lock, Wifi, Home, ArrowRight } from 'lucide-react'

const categories = [
  {
    title: 'Vidéosurveillance',
    desc: 'Caméras IP, NVR, kits complets',
    href: '/produits?category=Vid%C3%A9osurveillance',
    icon: Camera,
    gradient: 'from-blue-500/20 to-blue-700/20',
    accent: 'text-blue-600',
    bgAccent: 'bg-blue-50',
  },
  {
    title: "Contrôle d'accès",
    desc: 'Lecteurs biométriques, serrures, badges',
    href: '/produits?category=Contr%C3%B4le+d%27Acc%C3%A8s',
    icon: Lock,
    gradient: 'from-violet-500/20 to-violet-700/20',
    accent: 'text-violet-600',
    bgAccent: 'bg-violet-50',
  },
  {
    title: 'Réseau & PoE',
    desc: 'Switches, routeurs, câbles, connectique',
    href: '/produits?category=R%C3%A9seau',
    icon: Wifi,
    gradient: 'from-emerald-500/20 to-emerald-700/20',
    accent: 'text-emerald-600',
    bgAccent: 'bg-emerald-50',
  },
  {
    title: 'Domotique',
    desc: 'Capteurs, automatisations, smart home',
    href: '/produits?category=Domotique',
    icon: Home,
    gradient: 'from-orange-500/20 to-orange-700/20',
    accent: 'text-orange-600',
    bgAccent: 'bg-orange-50',
  },
]

export default function CategoriesSection() {
  return (
    <section className="py-16 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            Catégories populaires
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((cat, i) => {
            const I = cat.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              >
                <Link
                  href={cat.href}
                  className="group relative block h-[200px] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all"
                >
                  {/* Background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient}`} />
                  
                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-between p-6">
                    <div className={`inline-flex w-12 h-12 rounded-xl ${cat.bgAccent} items-center justify-center`}>
                      <I className={`h-6 w-6 ${cat.accent}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">{cat.desc}</p>
                    </div>
                    <ArrowRight className="absolute top-6 right-6 h-5 w-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
