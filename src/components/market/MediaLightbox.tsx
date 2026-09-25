'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/market/storefront/Icon'

/**
 * Visionneuse plein écran — navigation flèches/clavier/molette,
 * zoom double-clic/double-tap + molette, déplacement par glisser.
 * Partagée galerie produit + images de description.
 */
export default function MediaLightbox({
  images,
  index,
  name = '',
  onClose,
  onIndexChange,
}: {
  images: string[]
  index: number
  name?: string
  onClose: () => void
  onIndexChange: (i: number) => void
}) {
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean; lastTap: number } | null>(null)

  const count = images.length
  const go = useCallback(
    (dir: 1 | -1) => {
      if (count < 2) return
      onIndexChange((index + dir + count) % count)
    },
    [count, index, onIndexChange]
  )

  // Reset zoom à chaque changement d'image
  useEffect(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [index])

  // Bloque le scroll arrière-plan + clavier
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [go, onClose])

  const toggleZoom = () => {
    if (scale > 1.05) {
      setScale(1)
      setPan({ x: 0, y: 0 })
    } else {
      setScale(2.5)
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const next = Math.min(4, Math.max(1, scale + (e.deltaY < 0 ? 0.4 : -0.4)))
    setScale(next)
    if (next <= 1) setPan({ x: 0, y: 0 })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, moved: false, lastTap: drag.current?.lastTap ?? 0 }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true
    if (scale > 1.05) {
      setPan({ x: d.panX + dx, y: d.panY + dy })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || d.moved) {
      // Swipe horizontal non zoomé → navigation
      if (d && scale <= 1.05) {
        const dx = e.clientX - d.x
        if (Math.abs(dx) > 60) go(dx > 0 ? -1 : 1)
      }
      return
    }
    // Tap : double-tap = zoom ; simple tap sur l'image = ne rien faire
    const now = Date.now()
    if (now - d.lastTap < 300) {
      toggleZoom()
      d.lastTap = 0
    } else {
      d.lastTap = now
      drag.current = { ...d }
    }
  }

  if (count === 0) return null
  const src = images[index] || images[0]

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Barre haute : compteur + fermer */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
        <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white tabular-nums">
          {index + 1} / {count}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Fermer"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      {/* Flèches */}
      {count > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); go(-1) }}
            className="absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:left-4"
            aria-label="Image précédente"
          >
            <Icon name="chevronLeft" size={22} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(1) }}
            className="absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:right-4"
            aria-label="Image suivante"
          >
            <Icon name="chevronRight" size={22} />
          </button>
        </>
      )}

      {/* Image */}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <img
          key={src}
          src={src}
          alt={name}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          onDoubleClick={(e) => { e.stopPropagation(); toggleZoom() }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg' }}
          className={cn(
            'max-h-full max-w-full select-none object-contain transition-transform duration-150',
            scale > 1.05 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
          )}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, touchAction: 'none' }}
        />
      </div>

      {/* Vignettes */}
      {count > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto p-3" onClick={(e) => e.stopPropagation()}>
          {images.map((s, i) => (
            <button
              key={i}
              onClick={() => onIndexChange(i)}
              className={cn(
                'h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 transition',
                i === index ? 'border-emerald-500' : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              <img src={s} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
