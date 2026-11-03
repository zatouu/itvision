import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/services/maintenance',
  'Maintenance des systèmes de sécurité',
  'Contrats de maintenance préventive et curative pour vidéosurveillance, contrôle d\'accès, alarmes et réseaux au Sénégal, avec rapports d\'intervention digitalisés.',
)

export default function ServicesMaintenanceLayout({ children }: { children: React.ReactNode }) {
  return children
}