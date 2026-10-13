import { MARKET_BRAND } from '@/lib/branding'

/** Montant FCFA avec espace normale comme séparateur de milliers (compatible SMS / images). */
export const fcfa = (n: number) => `${String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`

/**
 * Texte de diffusion (Chaîne WhatsApp, statut, réseaux) d'un achat groupé.
 * Module sans dépendance serveur : utilisable côté admin (kit de diffusion) et côté serveur.
 */
export function groupAnnouncementText(g: any): string {
  const url = `${MARKET_BRAND.url}/achats-groupes/${g.groupId}`
  const tiers = [...(g.priceTiers || [])].sort((a: any, b: any) => a.minQty - b.minQty)
  const best = tiers.length ? tiers[tiers.length - 1] : null
  const base = g.product?.basePrice || 0
  const unit = g.currentUnitPrice || base
  const close = g.deadline ? new Date(g.deadline).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  return [
    '*Nouvel achat groupé DDM+*',
    g.product?.name || 'Produit',
    `Prix de départ : *${fcfa(unit)}* la pièce${base > unit ? ` au lieu de ${fcfa(base)}` : ''}`,
    best && best.price < unit ? `Plus on est nombreux, plus ça baisse : jusqu'à *${fcfa(best.price)}* à ${best.minQty} pièces.` : 'Plus on est nombreux, plus ça baisse.',
    close ? `Inscriptions jusqu'au ${close}. Aucun paiement maintenant.` : 'Aucun paiement maintenant.',
    `Je rejoins : ${url}?via=chaine`,
  ].join('\n')
}
