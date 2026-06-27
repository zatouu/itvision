'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DDMLogo } from '@/components/branding/DDMLogo'
import { Wheat, User, HelpCircle, Users, LayoutGrid, Home } from 'lucide-react'

interface GrainsHeaderProps {
  balance: number
}

const NAV = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/produits', label: 'Catalogue', icon: LayoutGrid },
  { href: '/achats-groupes', label: 'Groupes', icon: Users },
  { href: '/grains', label: 'Fidélité DDM+', icon: Wheat },
  { href: '/aide', label: 'Aide', icon: HelpCircle },
]

export default function GrainsHeader({ balance }: GrainsHeaderProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <DDMLogo variant="circular" size="sm" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    active
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/grains"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold"
          >
            <Wheat className="w-4 h-4 fill-amber-500 text-amber-500" />
            {balance.toLocaleString('fr-FR')} Grains
          </Link>
          <Link
            href="/compte"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Mon compte</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
