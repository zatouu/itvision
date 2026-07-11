'use client'

import Image from 'next/image'
import clsx from 'clsx'
import { ProductVariant, ProductVariantGroup } from './types'

interface VariantSelectorsProps {
  variantGroups?: ProductVariantGroup[]
  selectedVariants: Record<string, string>
  onSelect: (groupName: string, variantId: string) => void
}

export default function VariantSelectors({ variantGroups, selectedVariants, onSelect }: VariantSelectorsProps) {
  if (!variantGroups || variantGroups.length === 0) return null

  const isColorGroup = (name: string) => name.toLowerCase().includes('color') || name.toLowerCase().includes('couleur') || name.toLowerCase().includes('colour')
  const isImageVariant = (v: ProductVariant) => !!v.image

  return (
    <div className="space-y-4">
      {variantGroups.map(group => {
        const isColor = isColorGroup(group.name)
        const colorVariants = group.variants.filter(isImageVariant)
        const hasImages = colorVariants.length >= 2 || (isColor && colorVariants.length > 0)

        return (
          <div key={group.name}>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-200 mb-2">
              {group.name}{' '}
              {selectedVariants[group.name] && (
                <span className="text-gray-500 dark:text-slate-400 font-normal">
                  : {group.variants.find(v => v.id === selectedVariants[group.name])?.name}
                </span>
              )}
            </p>

            {hasImages ? (
              /* Color Swatches with images */
              <div className="flex flex-wrap gap-2">
                {group.variants.map(v => {
                  const selected = selectedVariants[group.name] === v.id
                  return (
                    <button
                      key={v.id}
                      onClick={() => onSelect(group.name, v.id)}
                      className={clsx(
                        "relative w-12 h-12 rounded-lg border-2 overflow-hidden transition",
                        selected ? "border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-900" : "border-gray-200 dark:border-slate-600 hover:border-emerald-300 opacity-80 hover:opacity-100"
                      )}
                      title={v.name}
                    >
                      {v.image ? (
                        <Image src={v.image} alt={v.name} fill className="object-cover" sizes="48px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 dark:text-slate-400">{v.name.slice(0,2)}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              /* Size / Text pills */
              <div className="flex flex-wrap gap-2">
                {group.variants.map(v => {
                  const selected = selectedVariants[group.name] === v.id
                  return (
                    <button
                      key={v.id}
                      onClick={() => onSelect(group.name, v.id)}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-medium border-2 transition",
                        selected
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                          : "border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-emerald-300 hover:text-emerald-600"
                      )}
                    >
                      {v.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
