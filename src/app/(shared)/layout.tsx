import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { CORPORATE_SITE_URL, MARKET_SITE_URL } from '@/lib/branding'
import { isMarketHost } from '@/lib/middleware/domain'
import { SITE_OG_IMAGES } from '@/lib/seo'

// Pages communes aux deux sites (connexion, mot de passe, pages légales) : le titre,
// la description et le favicon suivent le domaine consulté — IT Vision Plus sur
// itvisionplus.sn, DDM+ sur ddm.sn. Chaque page peut préciser son titre via un layout
// enfant (le template ajoute la marque).
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') || ''
  if (isMarketHost(host)) {
    return {
      metadataBase: new URL(MARKET_SITE_URL),
      title: { default: 'DDM+ Marketplace', template: '%s | DDM+ Marketplace' },
      description:
        'DDM+ Marketplace : import direct Chine → Sénégal, achats groupés et prix usine. Livraison Dakar.',
      applicationName: 'DDM+',
      authors: [{ name: 'DDM+' }],
      icons: {
        icon: '/branding/ddm-logo-favicon.svg',
        shortcut: '/branding/ddm-logo-favicon.svg',
        apple: '/branding/ddm-logo-favicon.svg',
      },
      openGraph: {
        siteName: 'DDM+ Marketplace',
        locale: 'fr_SN',
        type: 'website',
        images: SITE_OG_IMAGES,
      },
      twitter: { card: 'summary_large_image' },
    }
  }
  return {
    metadataBase: new URL(CORPORATE_SITE_URL),
    title: { default: 'IT Vision Plus', template: '%s | IT Vision Plus' },
    description:
      'IT Vision Plus : sécurité électronique, vidéosurveillance, contrôle d\'accès, réseau et digitalisation à Dakar.',
    applicationName: 'IT Vision Plus',
    authors: [{ name: 'IT Vision Plus' }],
    icons: {
      icon: '/Icone.png',
      shortcut: '/Icone.png',
      apple: '/Icone.png',
    },
    openGraph: {
      siteName: 'IT Vision Plus',
      locale: 'fr_SN',
      type: 'website',
      images: SITE_OG_IMAGES,
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return children
}
