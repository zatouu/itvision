'use client'

import { motion } from 'framer-motion'

const BRANDS = [
  { name: 'Hikvision', initial: 'HI', color: 'bg-red-600' },
  { name: 'Dahua', initial: 'DH', color: 'bg-blue-600' },
  { name: 'Uniview', initial: 'UV', color: 'bg-emerald-600' },
  { name: 'Ruijie', initial: 'RJ', color: 'bg-violet-600' },
  { name: 'MikroTik', initial: 'MT', color: 'bg-orange-600' },
  { name: 'TP-Link', initial: 'TP', color: 'bg-sky-600' },
  { name: 'Ubiquiti', initial: 'UB', color: 'bg-slate-700' },
  { name: 'Ezviz', initial: 'EZ', color: 'bg-amber-500' },
]

export default function PartnerBrands() {
  return (
    <section className="py-12 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Fournisseurs partenaires</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {BRANDS.map((brand, idx) => (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-xl ${brand.color} flex items-center justify-center text-white text-xs font-bold`}>
                {brand.initial}
              </div>
              <span className="text-xs font-medium text-slate-700 text-center">{brand.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
