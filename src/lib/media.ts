/**
 * Médias produit : la galerie et les « images » de description peuvent contenir des vidéos
 * (fichier MP4/WebM téléversé, vidéo fournisseur 1688/AliExpress/Alibaba, lien YouTube).
 * Partagé par le serveur (import, format catalogue) et le client (fiche produit, admin).
 */

const VIDEO_EXT_RE = /\.(?:mp4|webm|ogg|ogv|mov|m4v|m3u8)(?:[?#]|$)/i
// Lecteurs des plateformes sources : URL de lecture sans extension explicite
const VIDEO_HOST_RE = /^https?:\/\/(?:cloud\.video\.taobao\.com|video\.aliexpress-media\.com|cloud\.video\.alibaba\.com|[a-z0-9-]+\.video\.alibaba\.com)\/play\//i

export function youTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/i)
  return m ? m[1] : null
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  return youTubeId(url) !== null
}

export function isVideoFileUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  return VIDEO_EXT_RE.test(url) || VIDEO_HOST_RE.test(url)
}

/** Vidéo lisible (fichier ou YouTube) — à afficher en <video>/<iframe>, jamais en <img> */
export function isVideoUrl(url: string | null | undefined): boolean {
  return isVideoFileUrl(url) || isYouTubeUrl(url)
}

/** Lecteur YouTube sans cookies de suivi */
export function youTubeEmbedUrl(url: string, autoplay = false): string | null {
  const id = youTubeId(url)
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}` : null
}

export function youTubeThumbnail(url: string): string | null {
  const id = youTubeId(url)
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
}

/** Première image (non vidéo) d'une liste de médias */
export function firstImage(media: (string | null | undefined)[] | null | undefined): string | undefined {
  return (media || []).find((u): u is string => typeof u === 'string' && u.length > 0 && !isVideoUrl(u))
}

/** URL de média affichable : absolue (https) ou servie par notre site (/api/uploads/…, /uploads/…) */
export function isDisplayableMediaUrl(url: unknown): url is string {
  return typeof url === 'string' && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url))
}
