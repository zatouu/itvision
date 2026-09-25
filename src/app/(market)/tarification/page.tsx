import type { Metadata } from 'next'
import ScreenPricing from '@/components/market/storefront/screens/ScreenPricing'

export const metadata: Metadata = {
  title: 'Détail de notre tarification — DDM+',
  description:
    'Transparence totale sur nos prix : logique de prix, transports, remises pack, frais de service 10% et assurance 2%.',
}

export default function TarificationPage() {
  return <ScreenPricing />
}
