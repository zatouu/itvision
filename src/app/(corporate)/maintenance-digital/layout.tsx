import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/maintenance-digital',
  'Rapports de maintenance digitalisés',
  'Outil de rapports de maintenance digitalisés IT Vision Plus.', true,
)

export default function MaintenanceDigitalLayout({ children }: { children: React.ReactNode }) {
  return children
}