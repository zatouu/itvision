import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/intervention',
  'Demande d\'intervention',
  'Accès au portail technicien IT Vision Plus.', true,
)

export default function InterventionLayout({ children }: { children: React.ReactNode }) {
  return children
}