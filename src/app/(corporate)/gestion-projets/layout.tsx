import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/gestion-projets',
  'Gestion de projets',
  'Outil de gestion de projets IT Vision Plus.', true,
)

export default function GestionProjetsLayout({ children }: { children: React.ReactNode }) {
  return children
}