import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IMaintenanceBid extends Document {
  activityId: Types.ObjectId
  technicianId: Types.ObjectId
  technicianName: string
  technicianPhone?: string
  amount: number
  availability: string
  message?: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
  updatedAt: Date
}

const MaintenanceBidSchema = new Schema<IMaintenanceBid>({
  activityId: { type: Schema.Types.ObjectId, ref: 'MaintenanceActivity', required: true, index: true },
  technicianId: { type: Schema.Types.ObjectId, ref: 'Technician', required: true },
  technicianName: { type: String, required: true },
  technicianPhone: { type: String },
  amount: { type: Number, required: true },
  availability: { type: String, required: true },
  message: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, {
  timestamps: true
})

const MaintenanceBid = mongoose.models.MaintenanceBid ||
  mongoose.model<IMaintenanceBid>('MaintenanceBid', MaintenanceBidSchema)

export default MaintenanceBid

