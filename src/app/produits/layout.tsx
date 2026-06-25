import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.itvisionplus.sn'

export const metadata: Metadata = {
  title: 'Catalogue Produits | IT Vision Plus — Import Chine & Sécurité Électronique',
  description:
    'Découvrez notre catalogue de produits importés directement de Chine : caméras IP, contrôle d\'accès, alarmes, domotique, réseau. Livraison Sénégal. Achats groupés disponibles.',
  keywords: [
    'produits sécurité',
    'import Chine Sénégal',
    'caméra IP Hikvision',
    'contrôle accès',
    'alarme',
    'domotique',
    'achat groupé',
    'IT Vision Plus',
    'Dakar',
  ],
  alternates: { canonical: `${SITE_URL}/produits` },
  openGraph: {
    title: 'Catalogue Produits — IT Vision Plus',
    description:
      'Import direct Chine, livraison Sénégal. Caméras, alarmes, contrôle d\'accès, réseau. Achats groupés pour payer moins cher.',
    url: `${SITE_URL}/produits`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Catalogue Produits — IT Vision Plus',
    description: 'Import direct Chine, livraison Sénégal. Achats groupés pour payer moins cher.',
  }
}

export default function ProduitsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
