import mongoose, { Document, Schema } from 'mongoose'

export interface IReview extends Document {
  productId: string
  userId?: string
  userName: string
  userEmail?: string
  rating: number
  title?: string
  comment: string
  photos?: string[]
  verified: boolean
  helpful: number
  status: 'pending' | 'approved' | 'rejected'
  orderId?: string
  createdAt: Date
  updatedAt: Date
}

const ReviewSchema = new Schema<IReview>({
  productId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userEmail: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  photos: {
    type: [String],
    default: []
  },
  verified: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  orderId: {
    type: String
  }
}, { timestamps: true })

ReviewSchema.index({ productId: 1, createdAt: -1 })

const Review = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema)

export default Review
