import type { Metadata } from 'next'
import PortalShell from './portal-shell'

export const metadata: Metadata = {
  title: {
    default: 'Espace entreprise · IT Vision',
    template: '%s · Espace entreprise IT Vision',
  },
  description: "Portail entreprise IT Vision : contrats de maintenance, interventions, projets, devis et factures.",
  robots: { index: false, follow: false },
}

export default function EnterprisePortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>
}
