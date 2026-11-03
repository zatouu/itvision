import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/portail-valeur',
  'Portail client : suivi de vos projets',
  'Suivez vos projets, interventions, rapports et devis en temps réel dans le portail client IT Vision Plus.',
)

export default function PortailValeurLayout({ children }: { children: React.ReactNode }) {
  return children
}