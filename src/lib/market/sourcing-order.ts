import crypto from 'crypto'
import { Order } from '@/lib/models/Order'

const SHIPPING_METHOD: Record<string, string> = {
  air_express: 'air_express',
  air_economy: 'air_15',
  sea_freight: 'sea_freight',
}

/**
 * Proposition de sourcing acceptée → commande DDM+ à payer, aux montants exacts de la
 * proposition (coût produit, frais de service, assurance, transport). Renvoie la référence
 * de commande et le jeton d'accès invité (lien de paiement sans compte).
 */
export async function createOrderFromSourcingProposal(doc: any): Promise<{ orderId: string; accessToken: string }> {
  const p = doc.proposal
  const orderId = `CMD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
  const accessToken = crypto.randomBytes(32).toString('base64url')
  const ttlDays = Number(process.env.ORDER_TRACKING_TOKEN_TTL_DAYS) > 0 ? Number(process.env.ORDER_TRACKING_TOKEN_TTL_DAYS) : 90

  const merchandise = Math.round(p.productCostFCFA + p.serviceFeeAmount + p.insuranceAmount)
  const totalFees = Math.round(p.serviceFeeAmount + p.insuranceAmount)

  await Order.create({
    orderId,
    clientName: doc.contactName || 'Client sourcing',
    clientEmail: doc.contactEmail || undefined,
    clientPhone: doc.contactPhone,
    clientId: doc.userId && /^[a-f0-9]{24}$/i.test(doc.userId) ? doc.userId : undefined,
    trackingAccessTokenHash: crypto.createHash('sha256').update(accessToken).digest('hex'),
    trackingAccessTokenCreatedAt: new Date(),
    trackingAccessTokenExpiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
    domain: 'marketplace',
    items: [{
      id: `sourcing:${doc.reference}`,
      name: p.productName,
      qty: p.qty,
      price: Math.round(merchandise / p.qty),
      currency: 'FCFA',
    }],
    fees: {
      supplierCost: Math.round(p.productCostFCFA),
      serviceFeeRate: p.serviceFeeRate,
      serviceFeeStandardRate: p.serviceFeeRate,
      serviceFeeAmount: Math.round(p.serviceFeeAmount),
      serviceFeeSavings: 0,
      insuranceRate: p.insuranceRate,
      insuranceAmount: Math.round(p.insuranceAmount),
      totalFees,
      exchangeRate: p.exchangeRate,
    },
    subtotalBeforeDiscounts: merchandise,
    subtotal: merchandise,
    shipping: {
      method: SHIPPING_METHOD[p.shippingMethod] || p.shippingMethod,
      totalCost: Math.round(p.shippingCost),
      currency: 'FCFA',
      totalWeight: p.weightKg ? p.weightKg * p.qty : undefined,
    },
    total: Math.round(p.totalClientPrice),
    address: { country: 'Sénégal', notes: 'Adresse de livraison à confirmer avec le client' },
    status: 'pending',
    paymentStatus: 'pending',
    currency: 'FCFA',
    source: 'web',
    tags: ['sourcing', doc.reference],
    internalNotes: `Commande issue de la demande de sourcing ${doc.reference}`,
  })

  return { orderId, accessToken }
}

export function sourcingPaymentPath(orderId: string, accessToken: string): string {
  return `/paiement/checkout/${encodeURIComponent(orderId)}?token=${encodeURIComponent(accessToken)}`
}
