'use client'

import { motion } from 'framer-motion'
import { Camera, FileText, ArrowRight, Clock, CheckCircle } from 'lucide-react'

interface SourcingOnDemandProps {
  onOpenImageSearch?: () => void
  onOpenSourcing?: () => void
}

const STEPS = [
  { icon: Camera, label: 'Envoyez une photo', desc: 'Du produit recherché' },
  { icon: FileText, label: 'Recevez un devis', desc: 'Sous 24h ouvrées' },
  { icon: CheckCircle, label: 'Commandez', desc: 'Nous gérons le reste' },
]

export default function SourcingOnDemand({ onOpenImageSearch, onOpenSourcing }: SourcingOnDemandProps) {
  return (
    <section className="py-12 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/30 dark:via-purple-950/20 dark:to-fuchsia-950/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Vous ne trouvez pas votre produit ?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Notre équipe de sourceurs en Chine le trouve pour vous. Envoyez une photo,
              une description ou une référence, et recevez un devis sous 24h.
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              <button
                type="button"
                onClick={onOpenImageSearch}
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
              >
                <Camera className="h-4 w-4" />
                Recherche par image
              </button>
              <button
                type="button"
                onClick={onOpenSourcing}
                className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-5 py-3 rounded-xl font-semibold transition-colors"
              >
                <FileText className="h-4 w-4" />
                Demander un devis
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4" />
              Réponse garantie sous 24h ouvrées
            </div>
          </div>

          {/* Right - Steps */}
          <div className="space-y-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15 }}
                  className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{step.label}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{step.desc}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
