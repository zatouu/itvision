import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/services/fiber-optic',
  'Fibre optique FTTH : installation et raccordement',
  'Déploiement fibre optique FTTH, soudure, raccordement et mesures pour entreprises, résidences et immeubles au Sénégal, par IT Vision Plus.',
)

export default function ServicesFiberOpticLayout({ children }: { children: React.ReactNode }) {
  return children
}