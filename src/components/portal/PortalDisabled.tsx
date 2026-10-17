import { Building2, LifeBuoy, ShieldOff } from 'lucide-react'
import { CORPORATE_BRAND, brandWhatsAppUrl } from '@/lib/branding'
import { CARD, BTN_PRIMARY, BTN_GHOST, PageHeader } from '@/components/portal-ui'

/**
 * Écran affiché quand l'admin a coupé l'accès portail d'une société
 * (Client.permissions.canAccessPortal = false). Rendu par le layout du
 * portail — évite toute boucle de redirection (/compte ↔ /portail-entreprise).
 */
export default function PortalDisabled({ companyName }: { companyName?: string }) {
  const brand = CORPORATE_BRAND
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 lg:py-16">
      <PageHeader
        size="xl"
        icon={ShieldOff}
        eyebrow="Espace entreprise"
        title="Accès au portail désactivé"
        subtitle={companyName ? <>Pour l'organisation <strong>{companyName}</strong></> : undefined}
      />
      <div className={`${CARD} mt-6 p-6 sm:p-8 space-y-5`}>
        <p className="text-sm text-stone-600 leading-relaxed">
          L'accès au portail entreprise de votre société a été désactivé par IT Vision.
          Vos contrats, interventions et documents restent gérés par nos équipes —
          contactez-nous pour le réactiver.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={brandWhatsAppUrl(brand, 'Bonjour, je souhaite réactiver l’accès au portail entreprise.')}
            target="_blank"
            rel="noopener noreferrer"
            className={BTN_PRIMARY}
          >
            <LifeBuoy className="w-4 h-4" /> Contacter IT Vision
          </a>
          <a href={`mailto:${brand.contactEmail}`} className={BTN_GHOST}>
            <Building2 className="w-4 h-4" /> {brand.contactEmail}
          </a>
        </div>
      </div>
    </div>
  )
}
