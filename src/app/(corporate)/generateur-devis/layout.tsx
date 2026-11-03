import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/generateur-devis',
  'Devis en ligne : sécurité électronique',
  'Estimez en quelques minutes le coût de votre installation de vidéosurveillance, contrôle d\'accès ou alarme avec le générateur de devis IT Vision Plus.',
)

export default function GenerateurDevisLayout({ children }: { children: React.ReactNode }) {
  return children
}