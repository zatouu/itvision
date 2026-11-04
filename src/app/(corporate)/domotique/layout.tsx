import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/domotique',
  'Domotique et bâtiment intelligent à Dakar',
  'Maison et bâtiment intelligents au Sénégal : éclairage, volets, climatisation, alarme et caméras pilotés depuis votre smartphone. Étude et installation par IT Vision Plus.',
)

export default function DomotiqueLayout({ children }: { children: React.ReactNode }) {
  return children
}