import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/digitalisation',
  'Digitalisation des processus PME',
  'Digitalisez vos processus avec IT Vision Plus : diagnostic, outils métiers, automatisation et accompagnement des PME et grandes entreprises au Sénégal.',
)

export default function DigitalisationLayout({ children }: { children: React.ReactNode }) {
  return children
}