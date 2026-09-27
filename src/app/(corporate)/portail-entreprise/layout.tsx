import type { Metadata } from 'next'
import PortalShell from './portal-shell'
import PortalDisabled from '@/components/portal/PortalDisabled'
import { getEnterpriseSession } from '@/lib/enterprise-auth'

export const metadata: Metadata = {
  title: {
    default: 'Espace entreprise · IT Vision',
    template: '%s · Espace entreprise IT Vision',
  },
  description: "Portail entreprise IT Vision : contrats de maintenance, interventions, projets, devis et factures.",
  robots: { index: false, follow: false },
}

export default async function EnterprisePortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getEnterpriseSession('/portail-entreprise')

  // Accès portail coupé par l'admin (Client.permissions.canAccessPortal = false) :
  // écran dédié plutôt qu'une redirection (évite la boucle /compte ↔ /portail-entreprise).
  if (!session.canAccessPortal) {
    return <PortalDisabled companyName={session.companyName} />
  }

  return <PortalShell>{children}</PortalShell>
}
