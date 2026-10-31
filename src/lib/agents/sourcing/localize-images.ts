/**
 * Localisation des images produits sourcées : les CDN chinois (alicdn,
 * aliexpress-media…) servent des placeholders lazy-load ou bloquent le
 * hotlink — on rapatrie le binaire dans /public/uploads/products via
 * l'endpoint interne (le fichier vit côté serveur, pas côté worker).
 *
 * Fail-open : si l'endpoint est indisponible ou refuse l'URL, on garde
 * l'URL distante — jamais de produit sans image à cause d'un téléchargement.
 */

const MAX_IMAGES = 8

export function isRemoteImageUrl(url: string): boolean {
  return /^https:\/\//i.test(url) && !url.startsWith('https://itvisionplus.sn')
}

export async function localizeImage(url: string): Promise<string> {
  if (!url || !isRemoteImageUrl(url)) return url

  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
  const secret = process.env.CRON_SECRET || ''
  if (!base || !secret) return url

  try {
    const res = await fetch(`${base}/api/internal/media/localize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cron-secret': secret },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(20_000),
    })
    const data = await res.json().catch(() => ({}))
    return res.ok && data?.ok && data.url ? String(data.url) : url
  } catch {
    return url
  }
}

/** Localise l'image principale + la galerie (cap MAX_IMAGES), en séquence. */
export async function localizeProductImages(input: { image?: string; gallery?: string[] }): Promise<{ image?: string; gallery: string[] }> {
  const gallery = (input.gallery || []).slice(0, MAX_IMAGES)
  const out: string[] = []
  for (const u of gallery) {
    out.push(await localizeImage(u))
  }
  const image = input.image ? await localizeImage(input.image) : out[0]
  return { image: image || out[0], gallery: out }
}
