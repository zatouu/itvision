import type { Metadata } from 'next'

// Lien privé (jeton) : jamais indexé
export const metadata: Metadata = {
  title: 'Votre demande de sourcing — DDM+',
  robots: { index: false, follow: false },
}

export default function SourcingTokenLayout({ children }: { children: React.ReactNode }) {
  return children
}
