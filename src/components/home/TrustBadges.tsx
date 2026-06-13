'use client'

import { ShieldCheck, PackageCheck, Truck, Lock, Factory } from 'lucide-react'

const BADGES = [
  { icon: Factory, label: 'Import direct usine', desc: 'Sans intermédiaires' },
  { icon: ShieldCheck, label: 'Fournisseur vérifié', desc: 'Inspection en Chine' },
  { icon: PackageCheck, label: 'Contrôle qualité', desc: 'Avant expédition' },
  { icon: Truck, label: 'Livraison garantie', desc: 'Dakar & régions' },
  { icon: Lock, label: 'Paiement sécurisé', desc: 'Escrow & Mobile Money' },
]

export default function TrustBadges() {
  return (
    <section className="py-10 bg-slate-50 border-y border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {BADGES.map((badge) => {
            const Icon = badge.icon
            return (
              <div
                key={badge.label}
                className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-100"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{badge.label}</div>
                  <div className="text-xs text-slate-500">{badge.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
