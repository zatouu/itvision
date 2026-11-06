import mongoose, { Schema, Document } from 'mongoose'

export interface IShopFollower extends Document {
  userId: string
  shopId: mongoose.Types.ObjectId
  shopSlug: string
  createdAt: Date
}

const ShopFollowerSchema = new Schema<IShopFollower>({
  userId: { type: String, required: true, index: true },
  shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  shopSlug: { type: String, required: true, index: true },
}, { timestamps: true })

ShopFollowerSchema.index({ userId: 1, shopId: 1 }, { unique: true })

export default mongoose.models.ShopFollower || mongoose.model<IShopFollower>('ShopFollower', ShopFollowerSchema)
