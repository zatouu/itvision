import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/services/videosurveillance',
  'Installation de vidéosurveillance à Dakar',
  'Caméras de surveillance HD/4K pour entreprises, commerces et villas à Dakar : étude, installation, accès à distance sur smartphone et maintenance par IT Vision Plus.',
)

export default function ServicesVideosurveillanceLayout({ children }: { children: React.ReactNode }) {
  return children
}