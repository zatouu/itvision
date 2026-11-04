import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/services/network-cabling',
  'Câblage réseau informatique et TV',
  'Câblage structuré cuivre, baies de brassage, Wi-Fi professionnel et distribution TV pour bureaux et immeubles au Sénégal, par IT Vision Plus.',
)

export default function ServicesNetworkCablingLayout({ children }: { children: React.ReactNode }) {
  return children
}