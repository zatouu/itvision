import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Créer un compte — DDM+',
  description: 'Créez votre compte DDM+ pour commander en Chine, rejoindre des achats groupés et suivre vos livraisons au Sénégal.',
  alternates: { canonical: '/market/creer-compte' },
  robots: { index: false, follow: true },
}

export default function CreerCompteLayout({ children }: { children: React.ReactNode }) {
  return children
}
