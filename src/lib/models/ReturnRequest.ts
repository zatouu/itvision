import mongoose, { Schema, Document } from 'mongoose'

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'in_transit' | 'received' | 'refunded' | 'closed'

export interface IReturnItem {
  productId: string
  name: string
  qty: number
  reason?: string
}

export interface IReturnTimelineEvent {
  status: ReturnStatus
  date: Date
  note?: string
  by?: string
}

export interface IReturnRequest extends Document {
  orderId: string
  orderReference: string
  clientId?: string
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  items: IReturnItem[]
  reason: string
  details?: string
  photos?: string[]
  status: ReturnStatus
  trackingNumber?: string
  refundAmount?: number
  refundMethod?: 'original' | 'wallet' | 'voucher'
  refundTransactionId?: string
  adminNotes?: string
  timeline: IReturnTimelineEvent[]
  createdAt: Date
  updatedAt: Date
}

const ReturnItemSchema = new Schema<IReturnItem>({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  reason: { type: String }
}, { _id: false })

const TimelineEventSchema = new Schema<IReturnTimelineEvent>({
  status: { type: String, enum: ['requested', 'approved', 'rejected', 'in_transit', 'received', 'refunded', 'closed'], required: true },
  date: { type: Date, default: Date.now },
  note: { type: String },
  by: { type: String }
}, { _id: false })

const ReturnRequestSchema = new Schema<IReturnRequest>({
  orderId: { type: String, required: true, index: true },
  orderReference: { type: String, required: true, index: true },
  clientId: { type: String, sparse: true, index: true },
  clientName: { type: String },
  clientEmail: { type: String },
  clientPhone: { type: String },
  items: { type: [ReturnItemSchema], required: true },
  reason: { type: String, required: true },
  details: { type: String },
  photos: { type: [String], default: [] },
  status: { type: String, enum: ['requested', 'approved', 'rejected', 'in_transit', 'received', 'refunded', 'closed'], default: 'requested', },
  trackingNumber: { type: String },
  refundAmount: { type: Number },
  refundMethod: { type: String, enum: ['original', 'wallet', 'voucher'] },
  refundTransactionId: { type: String },
  adminNotes: { type: String },
  timeline: { type: [TimelineEventSchema], default: [{ status: 'requested', date: new Date() }] }
}, { timestamps: true })

ReturnRequestSchema.index({ status: 1, createdAt: -1 })

const ReturnRequest = mongoose.models.ReturnRequest || mongoose.model<IReturnRequest>('ReturnRequest', ReturnRequestSchema)
export default ReturnRequest
