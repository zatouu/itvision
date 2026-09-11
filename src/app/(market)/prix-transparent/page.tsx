import type { Metadata } from 'next'
import ScreenPricing from '@/components/market/batch1/screens/ScreenPricing'

export const metadata: Metadata = {
  title: 'Prix transparent — DDM+',
  description:
    'Chaque prix est décomposé : prix usine, frais de service, assurance et transport. Aucun frais caché.',
}

export default function PrixTransparentPage() {
  return <ScreenPricing />
}
