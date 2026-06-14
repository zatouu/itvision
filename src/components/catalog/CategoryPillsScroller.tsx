'use client'

const defaultPills = [
  'Tous', 'Mode', 'Beauté', 'Maison', 'Électronique', 'Auto', 'Sport', 'Cuisine', 'Bébé', 'Animaux', 'Outils'
]

const pillIcons: Record<string, string> = {
  Tous: '🔍',
  Mode: '👕',
  Beauté: '💄',
  Maison: '🏠',
  Électronique: '📱',
  Auto: '🚗',
  Sport: '⚽',
  Cuisine: '🍳',
  Bébé: '🍼',
  Animaux: '🐕',
  Outils: '🔧',
}

interface Props {
  categories?: string[]
  active: string
  onSelect: (cat: string) => void
}

export default function CategoryPillsScroller({ categories, active, onSelect }: Props) {
  const pills = categories ?? defaultPills
  return (
    <div className="border-b border-slate-100 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 pt-2 scrollbar-hide">
          {pills.map((cat) => {
            const isActive = active === cat
            return (
              <button
                key={cat}
                onClick={() => onSelect(cat)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border transition-all flex-shrink-0 flex items-center gap-1 ${
                  isActive
                    ? 'bg-orange-50 border-orange-200 text-orange-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span className="text-sm">{pillIcons[cat] || '•'}</span>
                {cat}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
