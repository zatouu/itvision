'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser, PenLine } from 'lucide-react'

/**
 * Signature électronique — canvas responsive (souris + tactile).
 * `onChange(dataUrl | null)` est appelé à chaque trait.
 */
export default function SignaturePad({ onChange, height = 160 }: {
  onChange: (dataUrl: string | null) => void
  height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const empty = useRef(true)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Résolution x2 pour un rendu net sur écrans denses
    const ratio = Math.max(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth, h = canvas.clientHeight
    canvas.width = w * ratio
    canvas.height = h * ratio
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1c1917' // stone-900
  }, [])

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    canvasRef.current!.setPointerCapture(e.pointerId)
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    if (empty.current) {
      empty.current = false
      setHasInk(true)
      onChange(canvasRef.current!.toDataURL('image/png'))
    }
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    if (!empty.current) onChange(canvasRef.current!.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    empty.current = true
    setHasInk(false)
    onChange(null)
  }

  return (
    <div>
      <div className="relative rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/50 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ height }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-stone-300">
            <PenLine className="w-4 h-4" />
            <span className="text-xs font-medium">Signez ici (souris ou doigt)</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={clear} disabled={!hasInk}
          className="inline-flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-red-600 disabled:opacity-40 transition-colors">
          <Eraser className="w-3.5 h-3.5" /> Effacer
        </button>
      </div>
    </div>
  )
}
