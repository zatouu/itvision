import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Devenir vendeur sur DDM+ — Ouvrez votre boutique en ligne au Sénégal',
  description:
    'Vendez vos produits sur DDM+ : boutique en ligne gratuite, visibilité auprès des acheteurs sénégalais, paiement Mobile Money et accompagnement logistique.',
  alternates: { canonical: '/devenir-vendeur' },
}

export default function DevenirVendeurLayout({ children }: { children: React.ReactNode }) {
  return children
}
