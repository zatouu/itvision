'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Camera, FileText, ChevronRight } from 'lucide-react'

const CATEGORIES = [
  { name: 'Vidéosurveillance', href: '/produits?category=Vidéosurveillance' },
  { name: 'Contrôle d\'accès', href: '/produits?category=Contrôle+d\'accès' },
  { name: 'Réseau', href: '/produits?category=Réseau' },
  { name: 'Alarmes', href: '/produits?category=Alarmes' },
  { name: 'Domotique', href: '/produits?category=Domotique' },
  { name: 'Énergie solaire', href: '/produits?category=Énergie' },
  { name: 'Import Chine', href: '/produits?segment=import' },
  { name: 'Déstockage', href: '/produits?segment=in_stock' },
]

interface HeroSectionProps {
  onOpenImageSearch?: () => void
  onOpenSourcing?: () => void
}

export default function HeroSection({ onOpenImageSearch, onOpenSourcing }: HeroSectionProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/produits?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Import direct Chine au Sénégal
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
            Importer directement
            <span className="block text-emerald-400">de Chine au Sénégal</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 mb-8">
            +50 000 références · Prix usine · Livraison Dakar
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-6">
            <div className="flex items-center bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
              <div className="pl-4 text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un produit, marque ou référence..."
                className="flex-1 px-4 py-4 text-slate-900 placeholder:text-slate-400 outline-none text-base"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 font-semibold transition-colors"
              >
                Rechercher
              </button>
            </div>
          </form>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <button
              type="button"
              onClick={onOpenImageSearch}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <Camera className="h-4 w-4" />
              Recherche par image
            </button>
            <button
              type="button"
              onClick={onOpenSourcing}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <FileText className="h-4 w-4" />
              Demander un devis
            </button>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:text-white transition-all"
              >
                {cat.name}
                <ChevronRight className="h-3 w-3 opacity-50" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="h-16 bg-gradient-to-b from-transparent to-slate-50" />
    </section>
  )
}
