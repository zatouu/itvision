import mongoose, { Schema, Document } from 'mongoose'

interface IWorkflowStep {
  id: string
  name: string
  type: 'validation' | 'payment' | 'delivery' | 'installation' | 'test' | 'training' | 'approval' | 'notification'
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'delayed'
  dueDate?: Date
  dependencies: string[]
  deliverables: string[]
}

export interface IWorkflow extends Document {
  projectId: string // using string for flexibility with existing demo IDs
  serviceType: string
  currentStep: string
  progress: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  steps: IWorkflowStep[]
  startDate: Date
  estimatedEndDate?: Date
  actualEndDate?: Date
  createdAt: Date
  updatedAt: Date
}

const WorkflowStepSchema = new Schema<IWorkflowStep>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, default: 'pending' },
  dueDate: { type: Date },
  dependencies: { type: [String], default: [] },
  deliverables: { type: [String], default: [] },
})

const WorkflowSchema = new Schema<IWorkflow>({
  projectId: { type: String, index: true, required: true },
  serviceType: { type: String, required: true },
  currentStep: { type: String, required: true },
  progress: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'active', index: true },
  steps: { type: [WorkflowStepSchema], default: [] },
  startDate: { type: Date, default: Date.now },
  estimatedEndDate: { type: Date },
  actualEndDate: { type: Date },
}, { timestamps: true })

export default mongoose.models.Workflow || mongoose.model<IWorkflow>('Workflow', WorkflowSchema)
