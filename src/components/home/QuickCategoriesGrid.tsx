'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Smartphone, Shirt, Home, Sparkles, Car, Gamepad2,
  Dumbbell, ChefHat, Baby, Dog, Wrench, LayoutGrid,
} from 'lucide-react'
import { quickCategories } from '@/lib/home-data'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Smartphone, Shirt, Home, Sparkles, Car, Gamepad2,
  Dumbbell, ChefHat, Baby, Dog, Wrench, LayoutGrid,
}

export default function QuickCategoriesGrid() {
  return (
    <section className="py-8 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-6 md:grid-cols-12 gap-3 md:gap-4">
          {quickCategories.map((cat, i) => {
            const Icon = iconMap[cat.icon] || LayoutGrid
            return (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={cat.href}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 group-hover:ring-2 ring-emerald-500 group-hover:scale-110 transition-all flex items-center justify-center">
                    <Icon className={`w-6 h-6 md:w-7 md:h-7 ${cat.color}`} />
                  </div>
                  <span className="text-[10px] md:text-xs text-slate-600 text-center group-hover:text-emerald-600 transition-colors">
                    {cat.label}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
