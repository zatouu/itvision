'use client'

import { useState } from 'react'
import { formatDescription, type DescBlock } from '@/lib/catalog/description-format'
import MediaLightbox from '@/components/market/MediaLightbox'
import { isVideoUrl } from '@/lib/media'
import { ProductVideo } from './ProductImageGallery'

/**
 * Rendu premium « façon Taobao » de la description produit :
 * - texte nettoyé du bruit de scraping, structuré en titres/paragraphes/puces
 * - tableau de specs zébré (colonne clé grisée)
 * - images (et vidéos) de description en grand format, pleine largeur
 */
export default function ProductDescription({
  description,
  specs = [],
  descriptionImages = [],
  showSpecs = true,
}: {
  description?: string
  specs?: [string, string][]
  descriptionImages?: string[]
  /** false quand les caractéristiques sont déjà affichées ailleurs (section « Attributs ») */
  showSpecs?: boolean
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const blocks = formatDescription(description)
  const hasSpecs = showSpecs && specs.length > 0
  const photos = descriptionImages.filter(src => !isVideoUrl(src))
  const hasContent = blocks.length > 0 || hasSpecs || descriptionImages.length > 0

  if (!hasContent) {
    return (
      <p className="text-[13px] text-slate-500 dark:text-slate-400">
        Description non renseignée.
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
        // Grand format, images empilées bord à bord comme sur 1688 / Alibaba ; vidéos lues sur place
        <div className="-mx-4 md:mx-0">
          <div className="mx-auto max-w-[880px] overflow-hidden bg-white md:rounded-xl md:border md:border-slate-200 dark:bg-slate-900 md:dark:border-slate-800">
            {descriptionImages.map((src, i) => isVideoUrl(src) ? (
              <div key={`${src}-${i}`} className="aspect-video w-full bg-black">
                <ProductVideo src={src} title="Vidéo de présentation du produit" />
              </div>
            ) : (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setLightboxIndex(photos.indexOf(src))}
                className="block w-full cursor-zoom-in"
                aria-label="Agrandir l'image"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {lightboxIndex !== null && lightboxIndex >= 0 && (
        <MediaLightbox
          images={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
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
