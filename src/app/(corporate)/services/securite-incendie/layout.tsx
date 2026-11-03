import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/services/securite-incendie',
  'Sécurité incendie : détection et alarme',
  'Détection incendie, alarmes, désenfumage et extinction au Sénégal : systèmes conformes installés, testés et maintenus par IT Vision Plus.',
)

export default function ServicesSecuriteIncendieLayout({ children }: { children: React.ReactNode }) {
  return children
}