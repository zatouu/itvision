'use client'

import { formatDescription, type DescBlock } from '@/lib/catalog/description-format'

/**
 * Rendu premium « façon Taobao » de la description produit :
 * - texte nettoyé du bruit de scraping, structuré en titres/paragraphes/puces
 * - tableau de specs zébré (colonne clé grisée)
 * - bande d'images de description pleine largeur quand disponible
 */
export default function ProductDescription({
  description,
  specs = [],
  descriptionImages = [],
}: {
  description?: string
  specs?: [string, string][]
  descriptionImages?: string[]
}) {
  const blocks = formatDescription(description)
  const hasSpecs = specs.length > 0
  const hasContent = blocks.length > 0 || hasSpecs || descriptionImages.length > 0

  if (!hasContent) {
    return (
      <p className="text-[13px] text-slate-500 dark:text-slate-400">
        Produit importé directement depuis la Chine. Inspection qualité incluse avant expédition.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {blocks.length > 0 && (
        <div className="space-y-3">
          {blocks.map((b, i) => <DescBlockView key={i} block={b} />)}
        </div>
      )}

      {hasSpecs && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-emerald-600" />
            <h4 className="text-[13px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
              Caractéristiques
            </h4>
          </div>
          <dl className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            {specs.map(([k, v], i) => (
              <div
                key={`${k}-${i}`}
                className={`grid grid-cols-[minmax(110px,38%)_1fr] ${i % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/60' : 'bg-white dark:bg-slate-900'}`}
              >
                <dt className="px-3 py-2.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">{k}</dt>
                <dd className="px-3 py-2.5 text-[12px] font-semibold text-slate-900 dark:text-white">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {descriptionImages.length > 0 && (
        <div className="-mx-1 space-y-2">
          {descriptionImages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              className="w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DescBlockView({ block }: { block: DescBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="flex items-center gap-2 pt-1">
          <span className="h-4 w-1 rounded-full bg-emerald-600" />
          <h4 className="text-[13px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
            {block.text}
          </h4>
        </div>
      )
    case 'bullets':
      return (
        <ul className="space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
              <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'specs':
      return (
        <dl className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          {block.items.map(([k, v], i) => (
            <div
              key={`${k}-${i}`}
              className={`grid grid-cols-[minmax(110px,38%)_1fr] ${i % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/60' : 'bg-white dark:bg-slate-900'}`}
            >
              <dt className="px-3 py-2.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">{k}</dt>
              <dd className="px-3 py-2.5 text-[12px] font-semibold text-slate-900 dark:text-white">{v}</dd>
            </div>
          ))}
        </dl>
      )
    default:
      return (
        <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          {block.text}
        </p>
      )
  }
}
