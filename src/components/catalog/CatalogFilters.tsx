'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'

interface FilterSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function FilterSection({ title, children, defaultOpen = false }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-100 last:border-b-0 pb-4 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-semibold text-slate-700 mb-2"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  )
}

interface CheckboxOption {
  value: string
  label: string
  count?: number
}

function CheckboxList({ options, selected, onToggle }: {
  options: CheckboxOption[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-slate-900">
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => onToggle(opt.value)}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="flex-1">{opt.label}</span>
          {opt.count !== undefined && (
            <span className="text-xs text-slate-400">{opt.count.toLocaleString('fr-FR')}</span>
          )}
        </label>
      ))}
    </div>
  )
}

interface Props {
  activeFilters: Array<{ key: string; label: string }>
  onRemoveFilter: (key: string) => void
  onReset: () => void
}

export default function CatalogFilters({ activeFilters, onRemoveFilter, onReset }: Props) {
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000])
  const [origins, setOrigins] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [availabilities, setAvailabilities] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [promos, setPromos] = useState<string[]>([])
  const [delivery, setDelivery] = useState<string>('all')

  const originOptions: CheckboxOption[] = [
    { value: 'china', label: 'Import Chine', count: 8245 },
    { value: 'dakar', label: 'Stock Dakar', count: 1203 },
    { value: 'express', label: 'Express 3j', count: 542 },
  ]

  const categoryOptions: CheckboxOption[] = [
    { value: 'mode', label: 'Mode', count: 1245 },
    { value: 'beaute', label: 'Beauté', count: 876 },
    { value: 'maison', label: 'Maison', count: 2103 },
    { value: 'electronique', label: 'Électronique', count: 1542 },
    { value: 'auto', label: 'Auto', count: 650 },
    { value: 'sport', label: 'Sport', count: 420 },
    { value: 'cuisine', label: 'Cuisine', count: 780 },
  ]

  const availabilityOptions: CheckboxOption[] = [
    { value: 'in_stock', label: 'En stock', count: 1203 },
    { value: 'preorder', label: 'Sur commande', count: 9245 },
  ]

  const typeOptions: CheckboxOption[] = [
    { value: 'individual', label: 'Achat individuel', count: 11203 },
    { value: 'group', label: 'Achat groupé', count: 1255 },
  ]

  const promoOptions: CheckboxOption[] = [
    { value: 'flash', label: '⚡ Flash Sale', count: 120 },
    { value: 'new', label: '✨ Nouveautés', count: 234 },
  ]

  const deliveryOptions: CheckboxOption[] = [
    { value: 'all', label: 'Tous' },
    { value: '1-3', label: '1-3 jours' },
    { value: '3-7', label: '3-7 jours' },
    { value: '7-15', label: '7-15 jours' },
    { value: '15-30', label: '15-30 jours' },
  ]

  const toggle = (val: string, arr: string[], set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val])
  }

  return (
    <aside className="sticky top-[180px] h-[calc(100vh-200px)] overflow-y-auto pr-2">
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">Filtres actifs</span>
              <button onClick={onReset} className="text-xs text-violet-600 hover:underline">
                Réinitialiser
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => onRemoveFilter(f.key)}
                  className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-1 flex items-center gap-1"
                >
                  {f.label} <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        <FilterSection title="Prix (FCFA)" defaultOpen>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="range"
              min={0}
              max={500000}
              step={5000}
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
              className="w-full accent-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1"
            />
            <input
              type="number"
              placeholder="Max"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1"
            />
          </div>
        </FilterSection>

        <FilterSection title="Origine">
          <CheckboxList
            options={originOptions}
            selected={origins}
            onToggle={(v) => toggle(v, origins, setOrigins)}
          />
        </FilterSection>

        <FilterSection title="Catégories">
          <CheckboxList
            options={categoryOptions}
            selected={categories}
            onToggle={(v) => toggle(v, categories, setCategories)}
          />
        </FilterSection>

        <FilterSection title="Disponibilité">
          <CheckboxList
            options={availabilityOptions}
            selected={availabilities}
            onToggle={(v) => toggle(v, availabilities, setAvailabilities)}
          />
        </FilterSection>

        <FilterSection title="Type d'achat">
          <CheckboxList
            options={typeOptions}
            selected={types}
            onToggle={(v) => toggle(v, types, setTypes)}
          />
        </FilterSection>

        <FilterSection title="Promotions">
          <CheckboxList
            options={promoOptions}
            selected={promos}
            onToggle={(v) => toggle(v, promos, setPromos)}
          />
        </FilterSection>

        <FilterSection title="Délai livraison">
          <div className="space-y-1.5">
            {deliveryOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                <input
                  type="radio"
                  name="delivery"
                  checked={delivery === opt.value}
                  onChange={() => setDelivery(opt.value)}
                  className="w-4 h-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </FilterSection>
      </div>
    </aside>
  )
}
