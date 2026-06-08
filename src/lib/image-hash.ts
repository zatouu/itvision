/**
 * Perceptual image hashing utilities (built on `sharp`).
 *
 * Objectif : reconnaissance visuelle "best-effort" pour la recherche
 * de produits par image, sans aucune dépendance externe payante.
 *
 * - `dHash` (difference hash) bidirectionnel sur 9x9 grayscale → 128 bits = 16 octets.
 *   Compare voisin droit (horizontal) + voisin bas (vertical) pour plus de robustesse.
 * - Histogramme couleur grossier 8 bins (HSV simplifié) pour pénaliser
 *   les images de catégorie totalement différente (ex: caméra vs interphone).
 *
 * Le tout sérialisé dans un `number[]` de longueur fixe = 136 valeurs :
 *   [128 bits dHash bidirectionnel (0/1)] + [8 floats normalisés histogramme couleur 0-1]
 * pour pouvoir le stocker dans `Product.imageEmbedding` (existant) et le
 * comparer via Hamming distance + corrélation simple.
 */

import sharp from 'sharp'

export const EMBEDDING_BITS = 128
export const COLOR_BINS = 8
export const EMBEDDING_LENGTH = EMBEDDING_BITS + COLOR_BINS // 136

export type ImageEmbedding = number[]

export interface ComputeEmbeddingResult {
  embedding: ImageEmbedding
  width: number
  height: number
  /** Hash hex compact (32 chars) pour debug / dedup */
  hashHex: string
}

/**
 * Calcule l'embedding visuel d'une image fournie sous forme de Buffer ou d'URL distante.
 * Throws si l'image est invalide ou trop petite.
 */
export async function computeImageEmbedding(input: Buffer | string): Promise<ComputeEmbeddingResult> {
  let buffer: Buffer
  if (typeof input === 'string') {
    buffer = await fetchImageBuffer(input)
  } else {
    buffer = input
  }

  // Sharp gère JPEG/PNG/WebP/GIF/AVIF nativement
  const img = sharp(buffer, { failOn: 'none' }).rotate() // auto-orient via EXIF
  const meta = await img.metadata()
  if (!meta.width || !meta.height) {
    throw new Error('Image illisible (métadonnées manquantes)')
  }

  // ── dHash bidirectionnel : 9x9 grayscale → 128 bits ──
  // 64 bits horizontal (voisin droit) + 64 bits vertical (voisin bas)
  const grayBuffer = await img
    .clone()
    .resize(9, 9, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer()

  const bits: number[] = new Array(EMBEDDING_BITS)
  // Horizontal : 8×8 = 64 bits
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const idx = y * 9 + x
      bits[y * 8 + x] = grayBuffer[idx] > grayBuffer[idx + 1] ? 1 : 0
    }
  }
  // Vertical : 8×8 = 64 bits
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const idx = y * 9 + x
      bits[64 + y * 8 + x] = grayBuffer[idx] > grayBuffer[idx + 9] ? 1 : 0
    }
  }

  // ── Histogramme couleur (8 bins HSV simplifié, valeur 0-1) ──
  // On extrait un échantillon 16x16 RGB puis bucketise par teinte+saturation
  const rgbSample = await img
    .clone()
    .resize(16, 16, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer()

  const histogram = new Array(COLOR_BINS).fill(0)
  const totalPx = (rgbSample.length / 3) || 1
  for (let i = 0; i < rgbSample.length; i += 3) {
    const r = rgbSample[i] / 255
    const g = rgbSample[i + 1] / 255
    const b = rgbSample[i + 2] / 255
    const bin = classifyColor(r, g, b)
    histogram[bin]++
  }
  for (let i = 0; i < COLOR_BINS; i++) histogram[i] = +(histogram[i] / totalPx).toFixed(4)

  const embedding = [...bits, ...histogram]

  // Hash hex compact pour dedup (128 bits = 16 bytes = 32 hex chars)
  let hashHex = ''
  for (let i = 0; i < 16; i++) {
    let byte = 0
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b]
    hashHex += byte.toString(16).padStart(2, '0')
  }

  return { embedding, width: meta.width, height: meta.height, hashHex }
}

/**
 * Classifie une couleur RGB dans 8 buckets visuels.
 * 0:noir 1:blanc 2:gris/argent 3:rouge 4:jaune/orange 5:vert 6:bleu 7:violet/magenta
 */
function classifyColor(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const lum = (r + g + b) / 3
  const saturation = max === 0 ? 0 : delta / max

  // Achromatique
  if (saturation < 0.15) {
    if (lum < 0.2) return 0 // noir
    if (lum > 0.8) return 1 // blanc
    return 2 // gris/argent
  }
  // Chromatique : déterminer la teinte
  let hue = 0
  if (max === r) hue = ((g - b) / delta) % 6
  else if (max === g) hue = (b - r) / delta + 2
  else hue = (r - g) / delta + 4
  hue *= 60
  if (hue < 0) hue += 360

  if (hue < 30 || hue >= 330) return 3 // rouge
  if (hue < 75) return 4 // jaune/orange
  if (hue < 165) return 5 // vert
  if (hue < 255) return 6 // bleu
  return 7 // violet/magenta
}

/**
 * Distance de Hamming normalisée (0 = identique, 1 = totalement différent).
 * Compare uniquement les 64 premiers bits (dHash).
 */
export function hammingDistance(a: ImageEmbedding, b: ImageEmbedding): number {
  if (!a || !b || a.length < EMBEDDING_BITS || b.length < EMBEDDING_BITS) return 1
  let diff = 0
  for (let i = 0; i < EMBEDDING_BITS; i++) if (a[i] !== b[i]) diff++
  return diff / EMBEDDING_BITS
}

/**
 * Similarité couleur cosine entre les deux histogrammes (0-1).
 */
export function colorSimilarity(a: ImageEmbedding, b: ImageEmbedding): number {
  if (!a || !b || a.length < EMBEDDING_LENGTH || b.length < EMBEDDING_LENGTH) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = EMBEDDING_BITS; i < EMBEDDING_LENGTH; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom > 0 ? dot / denom : 0
}

/**
 * Score combiné 0-100 (forme + couleur).
 * - 70% poids forme (dHash)
 * - 30% poids couleur
 */
export function similarityScore(a: ImageEmbedding, b: ImageEmbedding): number {
  const shapeSim = 1 - hammingDistance(a, b) // 0..1
  const colorSim = colorSimilarity(a, b)
  const combined = 0.7 * shapeSim + 0.3 * colorSim
  return Math.round(combined * 100)
}

/**
 * Télécharge une image depuis une URL absolue ou relative (locale `/api/uploads/...`).
 * Limite 10 Mo, timeout 8s.
 */
export async function fetchImageBuffer(url: string, opts?: { baseUrl?: string }): Promise<Buffer> {
  const isAbsolute = /^https?:\/\//i.test(url)
  let fullUrl = url
  if (!isAbsolute) {
    const base = opts?.baseUrl || process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    fullUrl = base.replace(/\/+$/, '') + (url.startsWith('/') ? url : '/' + url)
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(fullUrl, { signal: controller.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`Téléchargement échoué (${res.status})`)
    const len = Number(res.headers.get('content-length') || 0)
    if (len > 10 * 1024 * 1024) throw new Error('Image trop volumineuse (>10 Mo)')
    const ab = await res.arrayBuffer()
    if (ab.byteLength > 10 * 1024 * 1024) throw new Error('Image trop volumineuse (>10 Mo)')
    return Buffer.from(ab)
  } finally {
    clearTimeout(timeout)
  }
}

/** Pour validation Mongoose côté search route. */
export function isValidEmbedding(arr: any): arr is ImageEmbedding {
  return Array.isArray(arr) && arr.length === EMBEDDING_LENGTH && arr.every((v) => typeof v === 'number')
}
