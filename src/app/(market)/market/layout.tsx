import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.itvisionplus.sn'

export const metadata: Metadata = {
  title: 'DDM+ — Marketplace Import Chine & Sécurité Électronique',
  description:
    'Catalogue produits importés directement de Chine : caméras IP, contrôle d\'accès, alarmes, domotique, réseau. Livraison Sénégal. Achats groupés disponibles.',
  keywords: [
    'marketplace',
    'import Chine Sénégal',
    'caméra IP Hikvision',
    'contrôle accès',
    'alarme',
    'domotique',
    'achat groupé',
    'DDM+',
    'Dakar',
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Marketplace — DDM+',
    description:
      'Import direct Chine, livraison Sénégal. Caméras, alarmes, contrôle d\'accès, réseau. Achats groupés pour payer moins cher.',
    url: SITE_URL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketplace — DDM+',
    description: 'Import direct Chine, livraison Sénégal. Achats groupés pour payer moins cher.',
  }
}

import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import MarketBottomNav from '@/components/MarketBottomNav'

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketHeader />
      <div className="md:pb-0 pb-20">
        {children}
      </div>
      <MarketFooter />
      <MarketBottomNav />
    </>
  )
}
