'use client'

import Link from 'next/link'
import { Flame, Users, Camera, Clock } from 'lucide-react'

export default function PromoStrip() {
  return (
    <div className="container mx-auto px-4 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Flash Sale */}
        <Link
          href="/produits?segment=group_buy"
          className="relative overflow-hidden bg-gradient-to-r from-red-500 via-red-500 to-orange-500 text-white rounded-lg p-2.5 flex items-center gap-2.5 hover:shadow-md transition-shadow"
        >
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">Flash Sale</p>
            <p className="text-[10px] opacity-90 flex items-center gap-1">
              <Clock className="w-3 h-3" /> 02:34:18 restant
            </p>
          </div>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            -50%
          </span>
        </Link>

        {/* Group Buy */}
        <Link
          href="/achats-groupes"
          className="relative overflow-hidden bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg p-2.5 flex items-center gap-2.5 hover:shadow-md transition-shadow"
        >
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">Achats Groupés</p>
            <p className="text-[10px] opacity-90">Jusqu&apos;à -45% · 12 groupes</p>
          </div>
        </Link>

        {/* Image Search */}
        <Link
          href="/produits"
          className="relative overflow-hidden bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg p-2.5 flex items-center gap-2.5 hover:shadow-md transition-shadow"
        >
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">Trouver par photo</p>
            <p className="text-[10px] opacity-90">IA + sourcing en 24h</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
