/**
 * Mapping canonique des statuts de commande marketplace.
 * Source unique : API track-public, data-mappers et écrans l'utilisent tous.
 *
 * Statuts DB (Order.status) : pending | confirmed | processing | shipped |
 * delivered | cancelled — plus les alias transit/in_transit utilisés par
 * certaines écritures.
 */

export type OrderUiStatus =
  | 'ordered'
  | 'sourcing'
  | 'china'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'

export interface OrderStatusMeta {
  /** Statut UI utilisé par les écrans (types.ts OrderStatus) */
  ui: OrderUiStatus
  /** Étape dans la timeline 1..5 (0 = hors timeline : annulée) */
  step: number
  /** Libellé client */
  label: string
}

export const ORDER_STATUS_META: Record<string, OrderStatusMeta> = {
  pending: { ui: 'ordered', step: 1, label: 'Commande reçue' },
  ordered: { ui: 'ordered', step: 1, label: 'Commande reçue' },
  confirmed: { ui: 'ordered', step: 1, label: 'Commande confirmée' },
  processing: { ui: 'sourcing', step: 2, label: 'En préparation' },
  sourcing: { ui: 'sourcing', step: 2, label: 'Sourcing en Chine' },
  china: { ui: 'china', step: 3, label: 'Inspection qualité' },
  shipped: { ui: 'in_transit', step: 4, label: 'En transit' },
  in_transit: { ui: 'in_transit', step: 4, label: 'En transit' },
  transit: { ui: 'in_transit', step: 4, label: 'En transit' },
  delivered: { ui: 'delivered', step: 5, label: 'Livrée' },
  cancelled: { ui: 'cancelled', step: 0, label: 'Annulée' },
  refunded: { ui: 'cancelled', step: 0, label: 'Remboursée' },
}

const FALLBACK: OrderStatusMeta = { ui: 'ordered', step: 1, label: 'Commande reçue' }

export function orderStatusMeta(status?: string | null): OrderStatusMeta {
  return ORDER_STATUS_META[String(status || '').toLowerCase()] || FALLBACK
}

export const PAYMENT_SETTLED_STATUSES = new Set(['paid', 'completed', 'confirmed'])

/** Normalise les statuts de paiement hétérogènes ('paid'|'completed'|'held'). */
export function isPaymentSettled(paymentStatus?: string | null): boolean {
  return PAYMENT_SETTLED_STATUSES.has(String(paymentStatus || '').toLowerCase())
}
