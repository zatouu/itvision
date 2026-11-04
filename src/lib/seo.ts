import type { Metadata } from 'next'

const OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630 }

/** Image de partage du site courant (route /opengraph-image, propre au domaine). */
export const SITE_OG_IMAGES = [OG_IMAGE]

/**
 * Métadonnées d'une page vitrine : titre, description, canonical et Open Graph complets.
 * Un `openGraph` enfant remplace celui du parent : siteName, locale et image sont donc répétés ici.
 * Les URL relatives sont résolues par le `metadataBase` du layout du site (corporate ou market).
 * Le titre est absolu (marque incluse) : les gabarits ne traversent pas les layouts intermédiaires.
 */
export function pageMetadata(opts: {
  path: string
  title: string
  description: string
  siteName: string
  /** Outil ou espace de travail : accessible mais hors index. */
  noindex?: boolean
}): Metadata {
  const { path, description, siteName, noindex } = opts
  const title = opts.title.includes(siteName) || opts.title.includes('DDM+') ? opts.title : `${opts.title} | ${siteName}`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName, locale: 'fr_SN', type: 'website', images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE.url] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  }
}

export const corporatePage = (path: string, title: string, description: string, noindex = false) =>
  pageMetadata({ path, title, description, siteName: 'IT Vision Plus', noindex })
