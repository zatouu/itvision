'use client'

import Link from 'next/link'
import {
  Video, DoorOpen, Wifi, Bell, Home, Sun, Smartphone, Package,
  HardDrive, Monitor, Cable, Lock
} from 'lucide-react'

const CATEGORIES = [
  { name: 'Vidéosurveillance', icon: Video, href: '/produits?category=Vidéosurveillance', color: 'bg-blue-50 text-blue-600' },
  { name: 'Contrôle d\'accès', icon: DoorOpen, href: '/produits?category=Contrôle+d\'accès', color: 'bg-emerald-50 text-emerald-600' },
  { name: 'Réseau & PoE', icon: Wifi, href: '/produits?category=Réseau', color: 'bg-violet-50 text-violet-600' },
  { name: 'Alarmes', icon: Bell, href: '/produits?category=Alarmes', color: 'bg-red-50 text-red-600' },
  { name: 'Domotique', icon: Home, href: '/produits?category=Domotique', color: 'bg-orange-50 text-orange-600' },
  { name: 'Énergie solaire', icon: Sun, href: '/produits?category=Énergie', color: 'bg-amber-50 text-amber-600' },
  { name: 'Accessoires', icon: Smartphone, href: '/produits?category=Accessoires', color: 'bg-sky-50 text-sky-600' },
  { name: 'Stockage', icon: HardDrive, href: '/produits?category=Stockage', color: 'bg-slate-50 text-slate-600' },
  { name: 'Écrans', icon: Monitor, href: '/produits?category=Écrans', color: 'bg-indigo-50 text-indigo-600' },
  { name: 'Câbles', icon: Cable, href: '/produits?category=Câbles', color: 'bg-teal-50 text-teal-600' },
  { name: 'Sécurité', icon: Lock, href: '/produits?category=Sécurité', color: 'bg-rose-50 text-rose-600' },
  { name: 'Tout le catalogue', icon: Package, href: '/produits', color: 'bg-emerald-50 text-emerald-600' },
]

export default function CategoryPills1688() {
  return (
    <section className="py-8 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <Link
                key={cat.name}
                href={cat.href}
                className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
              >
                <div className={`w-12 h-12 rounded-xl ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-slate-700 text-center leading-tight">
                  {cat.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
