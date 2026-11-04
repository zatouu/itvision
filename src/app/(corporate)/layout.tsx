import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { CORPORATE_SITE_URL } from '@/lib/branding'
import { SITE_OG_IMAGES } from '@/lib/seo'
import { buildCorporateLocalBusinessJsonLd } from '@/lib/structured-data'

// Chaque page déclare son propre canonical : ne jamais en mettre un ici (il serait hérité par toutes)
export const metadata: Metadata = {
  metadataBase: new URL(CORPORATE_SITE_URL),
  title: {
    default: 'IT Vision Plus — Sécurité électronique et vidéosurveillance à Dakar',
    template: '%s | IT Vision Plus',
  },
  description:
    'IT Vision Plus, intégrateur en sécurité électronique au Sénégal : vidéosurveillance, contrôle d\'accès, sécurité incendie, réseau, fibre optique, domotique et maintenance. Devis gratuit.',
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
    title: 'IT Vision Plus — Sécurité électronique & digitalisation au Sénégal',
    description:
      'Vidéosurveillance, contrôle d\'accès, sécurité incendie, réseau et domotique : conception, installation et maintenance à Dakar.',
    images: SITE_OG_IMAGES,
  },
  twitter: { card: 'summary_large_image' },
}

export default function CorporateLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildCorporateLocalBusinessJsonLd()) }}
      />
      {children}
    </>
  )
}
