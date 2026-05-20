import { buildGroupOrderPaymentSummary } from '@/lib/group-order-payment-summary'

type SupplierOrderStatus = 'draft' | 'to_order' | 'ordered' | 'shipped' | 'received' | 'cancelled'

interface BuildSupplierOrderOptions {
  nextGroupStatus: string
  existingSupplierOrder?: any
}

function buildSupplierReference(groupId: string): string {
  return `SUP-${groupId.replace(/^GRP-/, '')}`
}

function resolveSupplierOrderStatus(nextGroupStatus: string, currentStatus?: SupplierOrderStatus): SupplierOrderStatus {
  if (nextGroupStatus === 'ordered') return 'ordered'
  if (nextGroupStatus === 'shipped') return 'shipped'
  if (nextGroupStatus === 'delivered') return 'received'
  if (nextGroupStatus === 'cancelled') return 'cancelled'
  return currentStatus || 'to_order'
}

export function buildGroupSupplierOrder(group: any, options: BuildSupplierOrderOptions) {
  const existing = options.existingSupplierOrder || group.supplierOrder || {}
  const paymentSummary = buildGroupOrderPaymentSummary(group)
  const status = resolveSupplierOrderStatus(options.nextGroupStatus, existing.status)
  const createdAt = existing.createdAt || new Date()

  return {
    reference: existing.reference || buildSupplierReference(group.groupId),
    status,
    productName: group.product?.name || existing.productName || '',
    productId: group.product?.productId || existing.productId,
    quantity: Number(group.currentQty) || 0,
    unitPrice: Number(group.currentUnitPrice) || 0,
    expectedAmount: paymentSummary.totalAmount,
    collectedAmount: paymentSummary.paidAmount,
    outstandingAmount: paymentSummary.remainingAmount,
    paymentCoverageRatio: paymentSummary.totalAmount > 0
      ? Math.round((paymentSummary.paidAmount / paymentSummary.totalAmount) * 100)
      : 0,
    shippingMethod: group.shippingMethod || existing.shippingMethod,
    createdAt,
    orderedAt: status === 'ordered' ? (existing.orderedAt || new Date()) : existing.orderedAt,
    notes: existing.notes
  }
}
