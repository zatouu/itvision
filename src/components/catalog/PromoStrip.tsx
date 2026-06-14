'use client'

import Link from 'next/link'
import { Flame, Users, Camera } from 'lucide-react'

export default function PromoStrip() {
  return (
    <div className="container mx-auto px-4 py-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link
          href="/produits?segment=group_buy"
          className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg p-3 flex items-center gap-3 hover:scale-[1.02] transition-transform"
        >
          <Flame className="w-8 h-8 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Flash Sale</p>
            <p className="text-xs opacity-90">-50% sur 120 produits · 02:34:18</p>
          </div>
        </Link>

        <Link
          href="/achats-groupes"
          className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg p-3 flex items-center gap-3 hover:scale-[1.02] transition-transform"
        >
          <Users className="w-8 h-8 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Achats Groupés</p>
            <p className="text-xs opacity-90">Jusqu&apos;à -45% · 12 groupes ouverts</p>
          </div>
        </Link>

        <Link
          href="/trouver-pour-moi"
          className="bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-lg p-3 flex items-center gap-3 hover:scale-[1.02] transition-transform"
        >
          <Camera className="w-8 h-8 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Trouver par photo</p>
            <p className="text-xs opacity-90">IA + sourcing 24h</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
