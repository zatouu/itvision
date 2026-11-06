import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.itvisionplus.sn'

export const metadata: Metadata = {
  title: 'Achats Groupés | DDM+ — Import Chine à prix groupe',
  description:
    'Achetez en groupe et économisez jusqu\'à -45% sur l\'import Chine. Plus on est nombreux, moins c\'est cher. Caméras, électronique, mode, maison, beauté.',
  keywords: [
    'achats groupés',
    'import Chine Sénégal',
    'prix groupe',
    'achat collectif',
    'DDM+',
    'Dakar',
    'économies import',
  ],
  alternates: { canonical: `${SITE_URL}/achats-groupes` },
  openGraph: {
    title: 'Achats Groupés — DDM+',
    description:
      'Importez en groupe, économisez ensemble. Jusqu\'à -45% sur vos commandes import Chine.',
    url: `${SITE_URL}/achats-groupes`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Achats Groupés — DDM+',
    description: 'Importez en groupe, économisez ensemble. Jusqu\'à -45% sur l\'import Chine.',
  },
}

export default function AchatsGroupesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
