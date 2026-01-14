import mongoose, { Schema, Document } from 'mongoose'

export interface IContact extends Document {
  clientId: mongoose.Types.ObjectId
  nom: string
  fonction?: string
  telephone?: string
  email?: string
  isPrimary?: boolean // Contact principal
  createdAt: Date
  updatedAt: Date
}

const ContactSchema = new Schema<IContact>({
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  fonction: {
    type: String,
    trim: true
  },
  telephone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

ContactSchema.index({ clientId: 1, isPrimary: 1 })
ContactSchema.index({ nom: 'text', email: 'text', fonction: 'text' })

export default mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema)










