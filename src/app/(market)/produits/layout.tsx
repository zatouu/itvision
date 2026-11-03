import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  path: '/produits',
  title: 'Catalogue import Chine : prix usine livrés au Sénégal | DDM+',
  description:
    'Tout le catalogue DDM+ importé de Chine : électronique, maison, mode, beauté, auto, sport. Prix affichés tout compris, achats groupés et livraison suivie à Dakar et en régions.',
  siteName: 'DDM+ Marketplace',
})

export default function ProduitsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
