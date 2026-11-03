import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/services',
  'Services de sécurité électronique',
  'Vidéosurveillance, contrôle d\'accès, sécurité incendie, câblage réseau, fibre optique et maintenance : IT Vision Plus conçoit, installe et entretient vos systèmes au Sénégal.',
)

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children
}