import { ChinaPurchase, type ChinaPurchaseStatus, type IChinaPurchase } from '@/lib/models/ChinaPurchase'
import { buildGroupOrderPaymentSummary } from '@/lib/group-order-payment-summary'

export interface ChinaPurchaseSummary {
  purchaseId: string
  status: ChinaPurchaseStatus
  platform: '1688' | 'taobao' | 'alibaba' | 'manual'
  expectedAmount: number
  collectedAmount: number
  outstandingAmount: number
  paymentCoverageRatio: number
  updatedAt?: Date
}

function generateChinaPurchaseId(sourceId?: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const suffix = sourceId ? sourceId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() : random
  return `CN-${timestamp}-${suffix}`
}

function resolveInitialStatus(groupStatus: string, currentStatus?: ChinaPurchaseStatus): ChinaPurchaseStatus {
  if (groupStatus === 'cancelled') return 'cancelled'
  if (currentStatus && currentStatus !== 'cancelled') return currentStatus
  if (groupStatus === 'ordered') return 'purchased_1688'
  return 'to_purchase'
}

export function buildChinaPurchaseSummary(purchase: Pick<IChinaPurchase, 'purchaseId' | 'status' | 'platform' | 'customerFinancials' | 'updatedAt'>): ChinaPurchaseSummary {
  return {
    purchaseId: purchase.purchaseId,
    status: purchase.status,
    platform: purchase.platform,
    expectedAmount: purchase.customerFinancials?.expectedAmount || 0,
    collectedAmount: purchase.customerFinancials?.collectedAmount || 0,
    outstandingAmount: purchase.customerFinancials?.outstandingAmount || 0,
    paymentCoverageRatio: purchase.customerFinancials?.paymentCoverageRatio || 0,
    updatedAt: purchase.updatedAt
  }
}

export async function syncChinaPurchaseFromGroupOrder(group: any, nextGroupStatus?: string): Promise<ChinaPurchaseSummary | undefined> {
  const groupStatus = nextGroupStatus || group.status
  const existing = await ChinaPurchase.findOne({ 'source.type': 'group_order', 'source.id': group.groupId })
  const shouldCreate = ['ordering', 'ordered'].includes(groupStatus)

  if (!existing && !shouldCreate) {
    return undefined
  }

  const paymentSummary = buildGroupOrderPaymentSummary(group)
  const customerFinancials = {
    expectedAmount: paymentSummary.totalAmount,
    collectedAmount: paymentSummary.paidAmount,
    outstandingAmount: paymentSummary.remainingAmount,
    paymentCoverageRatio: paymentSummary.totalAmount > 0
      ? Math.round((paymentSummary.paidAmount / paymentSummary.totalAmount) * 100)
      : 0,
    currency: group.product?.currency || 'FCFA'
  }

  if (existing) {
    const nextStatus = resolveInitialStatus(groupStatus, existing.status)
    if (existing.status !== nextStatus) {
      existing.status = nextStatus
      existing.statusHistory.push({ status: nextStatus, changedAt: new Date(), by: 'system' })
    }
    existing.customerFinancials = customerFinancials
    if (existing.items?.[0]) {
      existing.items[0].quantity = Number(group.currentQty) || existing.items[0].quantity
      existing.items[0].expectedQty = Number(group.currentQty) || existing.items[0].expectedQty
      existing.items[0].unitPriceFcfa = Number(group.currentUnitPrice) || existing.items[0].unitPriceFcfa
    }
    await existing.save()
    return buildChinaPurchaseSummary(existing)
  }

  const status = resolveInitialStatus(groupStatus)
  const purchase = await ChinaPurchase.create({
    purchaseId: generateChinaPurchaseId(group.groupId),
    source: {
      type: 'group_order',
      id: group.groupId,
      label: group.product?.name || group.groupId
    },
    platform: '1688',
    status,
    items: [{
      productId: group.product?.productId,
      productName: group.product?.name || 'Produit achat groupé',
      quantity: Number(group.currentQty) || 1,
      expectedQty: Number(group.currentQty) || 1,
      receivedQty: 0,
      defectiveQty: 0,
      unitPriceFcfa: Number(group.currentUnitPrice) || undefined
    }],
    customerFinancials,
    freight: {
      shippingMethod: group.shippingMethod
    },
    statusHistory: [{ status, changedAt: new Date(), by: 'system' }]
  })

  return buildChinaPurchaseSummary(purchase)
}
