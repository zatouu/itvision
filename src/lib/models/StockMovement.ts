import mongoose, { Schema, Document } from 'mongoose'

// Journal des mouvements de stock vendeur — audit trail pour les boutiques
export interface IStockMovement extends Document {
  vendorId: mongoose.Types.ObjectId
  productId: mongoose.Types.ObjectId
  productName: string
  delta: number                       // +N entrée, -N sortie
  reason: 'sale' | 'restock' | 'adjust' | 'return' | 'group_delivery'
  orderId?: string                    // référence commande si sale/return
  note?: string
  stockAfter?: number                 // stock résultant après le mouvement
  createdBy?: string                  // userId si saisie manuelle
  createdAt: Date
}

const StockMovementSchema = new Schema<IStockMovement>({
  vendorId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  productName: { type: String, required: true },
  delta: { type: Number, required: true },
  reason: { type: String, enum: ['sale', 'restock', 'adjust', 'return', 'group_delivery'], required: true, index: true },
  orderId: { type: String },
  note: { type: String },
  stockAfter: { type: Number },
  createdBy: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } })

StockMovementSchema.index({ vendorId: 1, createdAt: -1 })
StockMovementSchema.index({ productId: 1, createdAt: -1 })

export default mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', StockMovementSchema)
