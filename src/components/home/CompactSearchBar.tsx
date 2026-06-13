'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Camera } from 'lucide-react'
import { searchChips } from '@/lib/home-data'

interface CompactSearchBarProps {
  onOpenImageSearch?: () => void
}

export default function CompactSearchBar({ onOpenImageSearch }: CompactSearchBarProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (q?: string) => {
    const term = q || query
    if (term.trim()) {
      router.push(`/produits?q=${encodeURIComponent(term.trim())}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto -mt-8 relative z-10 px-4">
      <div className="bg-white rounded-full shadow-xl border border-slate-200 flex items-center p-1.5 md:p-2">
        <Search className="w-5 h-5 text-slate-400 ml-3 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Rechercher un produit, marque ou par photo..."
          className="flex-1 px-3 py-2 outline-none bg-transparent text-sm md:text-base text-slate-800 placeholder:text-slate-400 min-w-0"
        />
        <button
          type="button"
          onClick={onOpenImageSearch}
          className="p-2 hover:bg-violet-50 rounded-full transition-colors"
          title="Recherche par image"
        >
          <Camera className="w-5 h-5 text-violet-600" />
        </button>
        <button
          onClick={() => handleSearch()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 md:px-6 py-2.5 rounded-full font-semibold text-sm transition-colors ml-1 flex-shrink-0"
        >
          Rechercher
        </button>
      </div>

      {/* Chips suggestions */}
      <div className="flex gap-2 mt-3 justify-center flex-wrap">
        {searchChips.map((chip) => (
          <button
            key={chip}
            onClick={() => handleSearch(chip)}
            className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-full hover:border-emerald-500 hover:text-emerald-600 transition text-slate-600"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
