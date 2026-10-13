/**
 * Vidéo courte (≈10 s, 720×1280) d'un achat groupé, générée dans le navigateur (canvas + MediaRecorder) :
 * accroche, prix qui baisse palier par palier, progression du groupe, appel à rejoindre.
 * Formats : MP4 quand le navigateur sait l'enregistrer (Safari, Chrome récents), sinon WebM.
 */

export interface GroupVideoData {
  name: string
  unit: number
  base: number
  tiers: { minQty: number; price: number }[]
  currentQty: number
  targetQty: number
  participants: number
  closeDate?: string
  link: string
  brand: string
  /** Photo servie depuis notre domaine (sinon le canvas devient non enregistrable) */
  photoUrl?: string
}

const W = 720
const H = 1280
const FPS = 30
const DURATION = 10_000

const fcfa = (n: number) => `${String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3))
const phase = (t: number, from: number, to: number) => ease((t - from) / (to - from))

function pickMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || null
}

export function canRenderGroupVideo(): boolean {
  return typeof document !== 'undefined' && !!pickMime() && typeof HTMLCanvasElement.prototype.captureStream === 'function'
}

async function loadImage(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return null
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
      if (lines.length === maxLines) break
    } else {
      line = test
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…')
  return lines
}

function pill(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, font: string, bg: string, fg: string, padX: number, h: number) {
  ctx.font = font
  const w = ctx.measureText(text).width + padX * 2
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(cx - w / 2, y, w, h, h / 2)
  ctx.fill()
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, y + h / 2 + 1)
}

export async function renderGroupVideo(d: GroupVideoData, onProgress?: (pct: number) => void): Promise<File> {
  const mime = pickMime()
  if (!mime) throw new Error('Enregistrement vidéo non pris en charge par ce navigateur')

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const photo = await loadImage(d.photoUrl)

  const tiers = [...d.tiers].sort((a, b) => a.minQty - b.minQty)
  const next = tiers.find((t) => t.minQty > d.currentQty)
  const best = tiers.length ? tiers[tiers.length - 1] : null
  const pct = d.targetQty > 0 ? Math.min(1, d.currentQty / d.targetQty) : 0
  const startPrice = d.base > d.unit ? d.base : d.unit

  const draw = (t: number) => {
    const bg = ctx.createLinearGradient(0, 0, W * 0.4, H)
    bg.addColorStop(0, '#4c1d95')
    bg.addColorStop(0.5, '#6d28d9')
    bg.addColorStop(1, '#047857')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    // En-tête
    ctx.fillStyle = '#fff'
    ctx.font = '800 40px system-ui, sans-serif'
    ctx.fillText(d.brand, W / 2, 80)
    pill(ctx, 'ACHAT GROUPÉ', W / 2, 100, '700 22px system-ui, sans-serif', '#ddd6fe', '#4c1d95', 18, 40)

    // Accroche
    const a = phase(t, 0, 800)
    ctx.globalAlpha = a
    ctx.fillStyle = '#fff'
    ctx.font = '800 52px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Achetez moins cher', W / 2, 205 + (1 - a) * 30)
    ctx.fillText('en groupe', W / 2, 265 + (1 - a) * 30)
    ctx.globalAlpha = 1

    // Photo (léger zoom arrière)
    const size = 440
    const zoom = 1.12 - 0.12 * phase(t, 0, 2500)
    const px = (W - size) / 2
    const py = 300
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(px, py, size, size, 36)
    ctx.clip()
    if (photo) {
      const s = size * zoom
      ctx.drawImage(photo, px - (s - size) / 2, py - (s - size) / 2, s, s)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(px, py, size, size)
    }
    ctx.restore()

    // Nom du produit
    ctx.fillStyle = '#ede9fe'
    ctx.font = '700 30px system-ui, sans-serif'
    wrap(ctx, d.name, W - 120, 2).forEach((l, i) => ctx.fillText(l, W / 2, 790 + i * 38))

    // Prix qui baisse : prix normal → prix actuel → prochain palier
    const p1 = phase(t, 2000, 3600)
    const p2 = next ? phase(t, 4200, 5600) : 0
    const shown = startPrice + (d.unit - startPrice) * p1 + (next ? (next.price - d.unit) * p2 : 0)
    if (t > 1800) {
      ctx.globalAlpha = phase(t, 1800, 2200)
      ctx.fillStyle = '#c4b5fd'
      ctx.font = '700 24px system-ui, sans-serif'
      ctx.fillText(p2 > 0.05 ? `SI LE GROUPE ATTEINT ${next!.minQty} PIÈCES` : 'PRIX ACTUEL DU GROUPE', W / 2, 890)
      ctx.fillStyle = '#fff'
      ctx.font = '900 92px system-ui, sans-serif'
      ctx.fillText(fcfa(shown), W / 2, 985)
      if (d.base > d.unit && p1 > 0.95) {
        ctx.fillStyle = '#6ee7b7'
        ctx.font = '800 30px system-ui, sans-serif'
        const save = Math.round(((d.base - shown) / d.base) * 100)
        ctx.fillText(`-${save} % par rapport au prix normal`, W / 2, 1030)
      }
      ctx.globalAlpha = 1
    }

    // Progression du groupe
    if (t > 6000) {
      const b = phase(t, 6000, 7600)
      ctx.globalAlpha = phase(t, 6000, 6300)
      ctx.fillStyle = '#fff'
      ctx.font = '800 30px system-ui, sans-serif'
      ctx.fillText('Plus on est nombreux, plus ça baisse', W / 2, 1080)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.beginPath()
      ctx.roundRect(70, 1100, W - 140, 22, 11)
      ctx.fill()
      ctx.fillStyle = '#6ee7b7'
      ctx.beginPath()
      ctx.roundRect(70, 1100, Math.max(22, (W - 140) * pct * b), 22, 11)
      ctx.fill()
      ctx.fillStyle = '#ddd6fe'
      ctx.font = '600 24px system-ui, sans-serif'
      ctx.fillText(`${d.currentQty}/${d.targetQty} pièces · ${d.participants} participant${d.participants > 1 ? 's' : ''}${d.closeDate ? ` · clôture ${d.closeDate}` : ''}`, W / 2, 1155)
      ctx.globalAlpha = 1
    }

    // Appel à l'action
    if (t > 7800) {
      const c = phase(t, 7800, 8300)
      const pulse = 1 + 0.04 * Math.sin((t - 7800) / 140)
      ctx.globalAlpha = c
      ctx.save()
      ctx.translate(W / 2, 1205)
      ctx.scale(pulse, pulse)
      pill(ctx, best && best.price < d.unit ? `Rejoins · jusqu'à ${fcfa(best.price)}` : 'Rejoins le groupe', 0, -32, '800 30px system-ui, sans-serif', '#fff', '#4c1d95', 34, 64)
      ctx.restore()
      ctx.fillStyle = '#ede9fe'
      ctx.font = '600 20px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(d.link.replace(/^https?:\/\//, ''), W / 2, 1262)
      ctx.globalAlpha = 1
    }
  }

  return recordCanvas(canvas, draw, 'ddm-achat-groupe', mime, onProgress)
}

async function recordCanvas(
  canvas: HTMLCanvasElement,
  draw: (t: number) => void,
  baseName: string,
  mime: string,
  onProgress?: (pct: number) => void
): Promise<File> {
  const stream = canvas.captureStream(FPS)
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_500_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  const done = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })

  draw(0)
  recorder.start(250)
  const start = performance.now()
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = performance.now() - start
      draw(Math.min(t, DURATION))
      onProgress?.(Math.min(99, Math.round((t / DURATION) * 100)))
      if (t >= DURATION) return resolve()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  recorder.stop()
  await done
  stream.getTracks().forEach((tr) => tr.stop())
  onProgress?.(100)

  const type = mime.split(';')[0]
  const ext = type === 'video/mp4' ? 'mp4' : 'webm'
  return new File([new Blob(chunks, { type })], `${baseName}.${ext}`, { type })
}

export interface ProductVideoData {
  name: string
  price: number
  /** Prix barré éventuel (promotion du vendeur) */
  compareAt?: number
  shopName: string
  /** Ex. « En stock à Dakar · livré en 24 h » */
  badge: string
  link: string
  brand: string
  photoUrl?: string
}

/** Vidéo 10 s d'un produit de boutique (kit revendeur) : photo, prix, disponibilité locale, appel à commander. */
export async function renderProductVideo(d: ProductVideoData, onProgress?: (pct: number) => void): Promise<File> {
  const mime = pickMime()
  if (!mime) throw new Error('Enregistrement vidéo non pris en charge par ce navigateur')

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const photo = await loadImage(d.photoUrl)

  const draw = (t: number) => {
    const bg = ctx.createLinearGradient(0, 0, W * 0.4, H)
    bg.addColorStop(0, '#064e3b')
    bg.addColorStop(0.55, '#047857')
    bg.addColorStop(1, '#0f172a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = '#fff'
    ctx.font = '800 40px system-ui, sans-serif'
    ctx.fillText(d.shopName, W / 2, 80)
    pill(ctx, `BOUTIQUE ${d.brand.toUpperCase()}`, W / 2, 100, '700 22px system-ui, sans-serif', '#a7f3d0', '#064e3b', 18, 40)

    const a = phase(t, 0, 800)
    ctx.globalAlpha = a
    ctx.fillStyle = '#fff'
    ctx.font = '800 50px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Disponible tout de suite', W / 2, 220 + (1 - a) * 30)
    ctx.globalAlpha = 1

    const size = 480
    const zoom = 1.15 - 0.15 * phase(t, 0, 3000)
    const px = (W - size) / 2
    const py = 270
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(px, py, size, size, 36)
    ctx.clip()
    if (photo) {
      const s = size * zoom
      ctx.drawImage(photo, px - (s - size) / 2, py - (s - size) / 2, s, s)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(px, py, size, size)
    }
    ctx.restore()

    ctx.fillStyle = '#ecfdf5'
    ctx.font = '700 32px system-ui, sans-serif'
    wrap(ctx, d.name, W - 120, 2).forEach((l, i) => ctx.fillText(l, W / 2, 800 + i * 40))

    if (t > 2200) {
      const p = phase(t, 2200, 3000)
      ctx.globalAlpha = p
      if (d.compareAt && d.compareAt > d.price) {
        ctx.fillStyle = '#a7f3d0'
        ctx.font = '700 34px system-ui, sans-serif'
        const old = fcfa(d.compareAt)
        ctx.fillText(old, W / 2, 900)
        const w = ctx.measureText(old).width
        ctx.fillRect(W / 2 - w / 2, 888, w, 3)
      }
      ctx.fillStyle = '#fff'
      ctx.font = '900 100px system-ui, sans-serif'
      ctx.fillText(fcfa(d.price), W / 2, 1000 + (1 - p) * 20)
      ctx.globalAlpha = 1
    }

    if (t > 4500) {
      ctx.globalAlpha = phase(t, 4500, 5000)
      pill(ctx, d.badge, W / 2, 1040, '800 28px system-ui, sans-serif', '#fde68a', '#78350f', 28, 56)
      ctx.globalAlpha = 1
    }

    if (t > 6500) {
      ctx.globalAlpha = phase(t, 6500, 7000)
      ctx.fillStyle = '#d1fae5'
      ctx.font = '600 24px system-ui, sans-serif'
      ctx.fillText('Paiement garanti · remboursé si non livré', W / 2, 1135)
      ctx.globalAlpha = 1
    }

    if (t > 7800) {
      const c = phase(t, 7800, 8300)
      const pulse = 1 + 0.04 * Math.sin((t - 7800) / 140)
      ctx.globalAlpha = c
      ctx.save()
      ctx.translate(W / 2, 1205)
      ctx.scale(pulse, pulse)
      pill(ctx, 'Commander maintenant', 0, -32, '800 32px system-ui, sans-serif', '#fff', '#064e3b', 36, 64)
      ctx.restore()
      ctx.fillStyle = '#ecfdf5'
      ctx.font = '600 20px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(d.link.replace(/^https?:\/\//, ''), W / 2, 1262)
      ctx.globalAlpha = 1
    }
  }

  return recordCanvas(canvas, draw, 'ddm-produit', mime, onProgress)
}
