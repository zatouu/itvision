import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IMaintenanceActivity extends Document {
  category: 'contract_visit' | 'ad_hoc' | 'product_install'
  visitId?: string
  contractId?: Types.ObjectId | null
  contractName?: string
  clientId?: Types.ObjectId | null
  clientName: string
  site?: string
  date: Date
  isContractual: boolean
  allowMarketplace: boolean
  preferredTechnicians?: Types.ObjectId[]
  bidsCount: number
  bestBidAmount?: number
  assignedBidId?: Types.ObjectId
  createdBy?: Types.ObjectId
  marketplaceReason?: string
  status: 'open' | 'assigned' | 'closed'
  productId?: string
  productName?: string
  installationOptions?: {
    includeMaterials?: boolean
    preferredDate?: Date
    notes?: string
    quantity?: number
  }
  clientContact?: {
    name?: string
    email?: string
    phone?: string
    address?: string
  }
  createdAt: Date
  updatedAt: Date
}

const MaintenanceActivitySchema = new Schema<IMaintenanceActivity>({
  category: {
    type: String,
    enum: ['contract_visit', 'ad_hoc', 'product_install'],
    default: 'ad_hoc',
    index: true
  },
  visitId: { type: String, index: true },
  contractId: { type: Schema.Types.ObjectId, ref: 'MaintenanceContract' },
  contractName: { type: String },
  clientId: { type: Schema.Types.ObjectId, ref: 'User' },
  clientName: { type: String, required: true },
  site: { type: String },
  date: { type: Date, required: true },
  isContractual: { type: Boolean, default: false },
  allowMarketplace: { type: Boolean, default: true },
  preferredTechnicians: [{
    type: Schema.Types.ObjectId,
    ref: 'Technician'
  }],
  status: { type: String, enum: ['open', 'assigned', 'closed'], default: 'open', index: true },
  bidsCount: { type: Number, default: 0 },
  bestBidAmount: { type: Number },
  assignedBidId: { type: Schema.Types.ObjectId, ref: 'MaintenanceBid' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  marketplaceReason: { type: String },
  productId: { type: String },
  productName: { type: String },
  installationOptions: {
    includeMaterials: Boolean,
    preferredDate: Date,
    notes: String,
    quantity: Number
  },
  clientContact: {
    name: String,
    email: String,
    phone: String,
    address: String
  }
}, {
  timestamps: true
})

const MaintenanceActivity = mongoose.models.MaintenanceActivity ||
  mongoose.model<IMaintenanceActivity>('MaintenanceActivity', MaintenanceActivitySchema)

export default MaintenanceActivity

