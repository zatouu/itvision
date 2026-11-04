import DigitalHomepage from '@/components/DigitalHomepage'
import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/',
  'IT Vision Plus — Sécurité électronique et vidéosurveillance à Dakar',
  'Intégrateur en sécurité électronique au Sénégal : vidéosurveillance, contrôle d\'accès, sécurité incendie, réseau, fibre optique, domotique et maintenance. Devis gratuit, intervention 24h/7j.',
)

export default function Home() {
  return <DigitalHomepage />
}
