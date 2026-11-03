import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/services/qhse',
  'QHSE : qualité, hygiène, sécurité, environnement',
  'Accompagnement QHSE d\'IT Vision Plus : démarche qualité, sécurité des chantiers et respect de l\'environnement sur nos installations au Sénégal.',
)

export default function ServicesQhseLayout({ children }: { children: React.ReactNode }) {
  return children
}