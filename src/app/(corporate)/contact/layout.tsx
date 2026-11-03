import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/contact',
  'Contact et devis gratuit à Dakar',
  'Contactez IT Vision Plus pour un devis gratuit en vidéosurveillance, contrôle d\'accès, sécurité incendie ou réseau. Intervention 24h/7j à Dakar et partout au Sénégal.',
)

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}