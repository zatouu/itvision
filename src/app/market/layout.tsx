import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IT Vision Plus — Marketplace Import Chine & Sécurité Électronique',
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
    'IT Vision Plus',
    'Dakar',
  ],
  openGraph: {
    title: 'Marketplace — IT Vision Plus',
    description:
      'Import direct Chine, livraison Sénégal. Caméras, alarmes, contrôle d\'accès, réseau. Achats groupés pour payer moins cher.',
    type: 'website',
  },
}

import MarketHeader from '@/components/MarketHeader'

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketHeader />
      {children}
    </>
  )
}
