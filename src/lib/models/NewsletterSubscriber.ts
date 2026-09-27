import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Inscription à la newsletter DDM+ (footer marketplace).
 * Email unique — la réinscription d'un email existant est idempotente.
 */
export interface INewsletterSubscriber extends Document {
  email: string
  unsubscribedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const NewsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    unsubscribedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

const NewsletterSubscriber: Model<INewsletterSubscriber> =
  mongoose.models.NewsletterSubscriber || mongoose.model<INewsletterSubscriber>('NewsletterSubscriber', NewsletterSubscriberSchema)

export default NewsletterSubscriber
