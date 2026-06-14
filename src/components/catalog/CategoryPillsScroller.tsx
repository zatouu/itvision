'use client'

const defaultPills = [
  'Tous', 'Mode', 'Beauté', 'Maison', 'Électronique', 'Auto', 'Sport', 'Cuisine', 'Bébé', 'Animaux', 'Outils'
]

interface Props {
  categories?: string[]
  active: string
  onSelect: (cat: string) => void
}

export default function CategoryPillsScroller({ categories, active, onSelect }: Props) {
  const pills = categories ?? defaultPills
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto pb-0 pt-3 scrollbar-hide">
          {pills.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                active === cat
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
