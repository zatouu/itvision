import { corporatePage } from '@/lib/seo'

export const metadata = corporatePage(
  '/services/controle-acces',
  'Contrôle d\'accès et pointage biométrique',
  'Contrôle d\'accès par badge RFID, empreinte ou reconnaissance faciale, pointeuses et interphones au Sénégal : installation et paramétrage par IT Vision Plus.',
)

export default function ServicesControleAccesLayout({ children }: { children: React.ReactNode }) {
  return children
}