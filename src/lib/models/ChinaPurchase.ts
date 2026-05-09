import mongoose, { Schema, Document } from 'mongoose'

export type ChinaPurchaseSourceType = 'order' | 'group_order' | 'manual'
export type ChinaPurchasePlatform = '1688' | 'taobao' | 'alibaba' | 'manual'
export type ChinaPurchaseStatus =
  | 'to_purchase'
  | 'purchased_1688'
  | 'paid_alipay'
  | 'seller_shipped'
  | 'received_guangzhou'
  | 'quality_check_pending'
  | 'quality_check_passed'
  | 'quality_check_failed'
  | 'quality_check_partial'
  | 'handed_to_freight'
  | 'cancelled'

export interface IChinaPurchaseItem {
  productId?: mongoose.Types.ObjectId | string
  productName: string
  sku?: string
  variant?: string
  productUrl?: string
  quantity: number
  expectedQty: number
  receivedQty: number
  defectiveQty: number
  unitPriceCny?: number
  unitPriceFcfa?: number
}

export interface IChinaPurchase extends Document {
  purchaseId: string
  source: {
    type: ChinaPurchaseSourceType
    id?: string
    label?: string
  }
  platform: ChinaPurchasePlatform
  platformOrderId?: string
  productUrl?: string
  sellerName?: string
  sellerContact?: string
  status: ChinaPurchaseStatus
  items: IChinaPurchaseItem[]
  customerFinancials: {
    expectedAmount: number
    collectedAmount: number
    outstandingAmount: number
    paymentCoverageRatio: number
    currency: string
  }
  alipay?: {
    paidAmountCny?: number
    paidAt?: Date
    reference?: string
    screenshotUrl?: string
  }
  guangzhouReception?: {
    collaboratorName?: string
    receivedAt?: Date
    warehouseAddress?: string
    notes?: string
    photos?: string[]
  }
  qualityCheck?: {
    checkedBy?: string
    checkedAt?: Date
    result?: 'pending' | 'passed' | 'failed' | 'partial'
    notes?: string
    photos?: string[]
    videos?: string[]
  }
  freight?: {
    providerName?: string
    trackingNumber?: string
    handedOverAt?: Date
    shippingMethod?: string
    packagesCount?: number
    grossWeightKg?: number
    volumeM3?: number
  }
  statusHistory: Array<{
    status: ChinaPurchaseStatus
    changedAt: Date
    by?: string
    note?: string
  }>
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export const CHINA_PURCHASE_STATUSES: ChinaPurchaseStatus[] = [
  'to_purchase',
  'purchased_1688',
  'paid_alipay',
  'seller_shipped',
  'received_guangzhou',
  'quality_check_pending',
  'quality_check_passed',
  'quality_check_failed',
  'quality_check_partial',
  'handed_to_freight',
  'cancelled'
]

const ChinaPurchaseItemSchema = new Schema<IChinaPurchaseItem>({
  productId: { type: mongoose.Schema.Types.Mixed },
  productName: { type: String, required: true },
  sku: { type: String },
  variant: { type: String },
  productUrl: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  expectedQty: { type: Number, required: true, min: 0 },
  receivedQty: { type: Number, default: 0, min: 0 },
  defectiveQty: { type: Number, default: 0, min: 0 },
  unitPriceCny: { type: Number },
  unitPriceFcfa: { type: Number }
}, { _id: false })

const ChinaPurchaseSchema = new Schema<IChinaPurchase>({
  purchaseId: { type: String, required: true, unique: true, index: true },
  source: {
    type: { type: String, enum: ['order', 'group_order', 'manual'], required: true, index: true },
    id: { type: String, index: true },
    label: { type: String }
  },
  platform: { type: String, enum: ['1688', 'taobao', 'alibaba', 'manual'], default: '1688', index: true },
  platformOrderId: { type: String, sparse: true, index: true },
  productUrl: { type: String },
  sellerName: { type: String },
  sellerContact: { type: String },
  status: { type: String, enum: CHINA_PURCHASE_STATUSES, default: 'to_purchase', index: true },
  items: { type: [ChinaPurchaseItemSchema], default: [] },
  customerFinancials: {
    expectedAmount: { type: Number, default: 0 },
    collectedAmount: { type: Number, default: 0 },
    outstandingAmount: { type: Number, default: 0 },
    paymentCoverageRatio: { type: Number, default: 0 },
    currency: { type: String, default: 'FCFA' }
  },
  alipay: {
    paidAmountCny: { type: Number },
    paidAt: { type: Date },
    reference: { type: String },
    screenshotUrl: { type: String }
  },
  guangzhouReception: {
    collaboratorName: { type: String },
    receivedAt: { type: Date },
    warehouseAddress: { type: String },
    notes: { type: String },
    photos: [{ type: String }]
  },
  qualityCheck: {
    checkedBy: { type: String },
    checkedAt: { type: Date },
    result: { type: String, enum: ['pending', 'passed', 'failed', 'partial'] },
    notes: { type: String },
    photos: [{ type: String }],
    videos: [{ type: String }]
  },
  freight: {
    providerName: { type: String },
    trackingNumber: { type: String },
    handedOverAt: { type: Date },
    shippingMethod: { type: String },
    packagesCount: { type: Number },
    grossWeightKg: { type: Number },
    volumeM3: { type: Number }
  },
  statusHistory: {
    type: [new Schema({
      status: { type: String, enum: CHINA_PURCHASE_STATUSES, required: true },
      changedAt: { type: Date, default: () => new Date() },
      by: { type: String },
      note: { type: String }
    }, { _id: false })],
    default: []
  },
  notes: { type: String }
}, { timestamps: true })

ChinaPurchaseSchema.index({ 'source.type': 1, 'source.id': 1 }, { unique: true, partialFilterExpression: { 'source.id': { $exists: true } } })
ChinaPurchaseSchema.index({ status: 1, updatedAt: -1 })

export const ChinaPurchase =
  (mongoose.models.ChinaPurchase as mongoose.Model<IChinaPurchase>) ||
  mongoose.model<IChinaPurchase>('ChinaPurchase', ChinaPurchaseSchema)
