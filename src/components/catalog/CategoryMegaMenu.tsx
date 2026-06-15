'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Menu, ChevronRight, Loader2 } from 'lucide-react'

interface SubCategory {
  slug: string
  name: string
  labelFr: string
  icon: string
}

interface Category {
  slug: string
  name: string
  labelFr: string
  icon: string
  color: string
  subCategories: SubCategory[]
}

export default function CategoryMegaMenu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch('/api/catalog/categories')
      .then(r => r.json())
      .then(data => {
        if (data?.success && Array.isArray(data.items)) {
          setCategories(data.items)
          if (data.items.length > 0) setActiveSlug(data.items[0].slug)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200)
  }

  const activeCat = categories.find(c => c.slug === activeSlug)

  // Map icon name to lucide-like display
  const IconDisplay = ({ name }: { name: string }) => {
    // Simple emoji fallback for common lucide icon names
    const emojiMap: Record<string, string> = {
      Video: '📹', Camera: '📷', HardDrive: '💾', Settings: '⚙️',
      Lock: '🔒', CreditCard: '💳', Phone: '📞', Shield: '🛡️',
      Bell: '🔔', Scan: '🔍', Volume2: '🔊', Eye: '👁️',
      Wifi: '📶', Router: '🌐', Cable: '🔌', Server: '🖥️',
      Home: '🏠', Lightbulb: '💡', Plug: '🔌', Thermometer: '🌡️',
      Cpu: '💻', Smartphone: '📱', Tablet: '📲', Monitor: '🖥️',
      Headphones: '🎧', Armchair: '🪑', Layers: '📚', Desk: '🪑',
      Cabinet: '🗄️', Tag: '🏷️'
    }
    return <span className="text-base">{emojiMap[name] || emojiMap['Tag']}</span>
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger button */}
      <button className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
        <Menu className="w-4 h-4" />
        <span className="hidden lg:inline">Toutes les catégories</span>
      </button>

      {/* Mega menu panel */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-[0_8px_30px_-8px_rgba(0,0,0,0.2)] overflow-hidden"
          style={{ width: 680, maxWidth: '90vw' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="flex">
              {/* Left: category list */}
              <div className="w-56 border-r border-slate-100 py-2">
                {categories.map(cat => (
                  <div
                    key={cat.slug}
                    onMouseEnter={() => setActiveSlug(cat.slug)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                      activeSlug === cat.slug
                        ? 'bg-orange-50 text-orange-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <IconDisplay name={cat.icon} />
                    <span className="flex-1 truncate">{cat.labelFr}</span>
                    {cat.subCategories?.length > 0 && (
                      <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${activeSlug === cat.slug ? 'text-orange-500' : 'text-slate-300'}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Right: subcategories */}
              <div className="flex-1 p-4 min-h-[300px]">
                {activeCat ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <IconDisplay name={activeCat.icon} />
                      <h3 className="font-semibold text-slate-900 text-sm">{activeCat.labelFr}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {activeCat.subCategories?.map(sub => (
                        <Link
                          key={sub.slug}
                          href={`/produits?category=${encodeURIComponent(sub.slug)}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-orange-600 transition-colors"
                        >
                          <IconDisplay name={sub.icon} />
                          <span className="truncate">{sub.labelFr}</span>
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={`/produits?category=${encodeURIComponent(activeCat.slug)}`}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-orange-600 hover:text-orange-700"
                    >
                      Voir tout dans {activeCat.labelFr} <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 py-8 text-center">Survolez une catégorie</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
