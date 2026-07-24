import mongoose, { Schema, model, models } from 'mongoose'

export type ProviderPortfolioType = 'realisation' | 'certification' | 'diplome'

const PortfolioMediaSchema = new Schema({
  url: { type: String, required: true },
  caption: { type: String },
}, { _id: false })

const PortfolioDocumentSchema = new Schema({
  url: { type: String, required: true },
  title: { type: String },
}, { _id: false })

const ProviderPortfolioSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  type: { type: String, enum: ['realisation', 'certification', 'diplome'], default: 'realisation' },
  images: { type: [PortfolioMediaSchema], default: [] },
  documents: { type: [PortfolioDocumentSchema], default: [] },
  isFeatured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })

ProviderPortfolioSchema.index({ userId: 1, type: 1 })
ProviderPortfolioSchema.index({ userId: 1, isFeatured: -1 })

const ProviderPortfolio = models.ProviderPortfolio || model('ProviderPortfolio', ProviderPortfolioSchema)
export default ProviderPortfolio
