import { readFile } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

/**
 * Prépare les photos d'une demande pour le modèle vision.
 * Les uploads mobiles sont des URLs relatives (`/uploads/<type>/<file>` ou `/api/uploads/...`)
 * stockées dans `public/uploads/` : on les lit sur disque, on les réduit (max 1024 px, JPEG)
 * et on les passe en data URI. Ça évite de dépendre d'une exposition publique du serveur
 * et divise le coût vision par 3 à 5 par rapport à la photo brute.
 * Les URLs http(s) absolues et data URIs sont transmises telles quelles (validées par qwen.ts).
 */

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads')
const MAX_DIMENSION = 1024
const JPEG_QUALITY = 80
const UPLOAD_PREFIX = /^\/(?:api\/)?uploads\//

function localUploadPath(url: string): string | null {
  const u = url.trim()
  if (!UPLOAD_PREFIX.test(u)) return null
  const rel = u.replace(UPLOAD_PREFIX, '').split('?')[0]
  if (!rel || rel.includes('..') || rel.includes('~')) return null
  const full = path.join(UPLOADS_ROOT, rel)
  if (!full.startsWith(UPLOADS_ROOT)) return null
  return full
}

async function fileToDataUri(fullPath: string): Promise<string | null> {
  try {
    const buf = await readFile(fullPath)
    const out = await sharp(buf)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    return `data:image/jpeg;base64,${out.toString('base64')}`
  } catch (err) {
    console.warn('[AI images] cannot prepare image:', fullPath, err instanceof Error ? err.message : err)
    return null
  }
}

export async function prepareImagesForVision(urls: string[], max: number): Promise<string[]> {
  const prepared = await Promise.all(
    urls.slice(0, max).map(async (raw) => {
      const local = localUploadPath(raw)
      if (local) return fileToDataUri(local)
      // URL absolue ou data URI : on laisse qwen.ts valider
      return raw.trim() || null
    })
  )
  return prepared.filter((u): u is string => !!u)
}
