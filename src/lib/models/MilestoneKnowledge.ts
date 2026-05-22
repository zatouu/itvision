import mongoose, { Schema, Document } from 'mongoose'

export interface IMilestoneKnowledge extends Document {
  phaseTemplate: string
  serviceType: string
  title: string
  description: string
  // Ce qu'on attend selon la phase
  expectedTasks: Array<{
    label: string
    required: boolean
    role: 'ADMIN' | 'TECHNICIAN' | 'CLIENT' | 'any'
    order: number
  }>
  // Livrables attendus
  expectedDeliverables: Array<{
    name: string
    description: string
    templateUrl?: string
  }>
  // Guides et ressources pédagogiques
  guides: Array<{
    title: string
    content: string
    type: 'text' | 'video' | 'document'
    url?: string
  }>
  // Leçons apprises accumulées de tous les projets
  communityLearnings: Array<{
    category: 'technical' | 'process' | 'client' | 'safety' | 'other'
    insight: string
    projectId?: string
    projectName?: string
    author: string
    createdAt: Date
  }>
  createdAt: Date
  updatedAt: Date
}

const MilestoneKnowledgeSchema = new Schema<IMilestoneKnowledge>({
  phaseTemplate: { type: String, required: true, index: true },
  serviceType: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  expectedTasks: [{
    label: String,
    required: { type: Boolean, default: false },
    role: { type: String, enum: ['ADMIN', 'TECHNICIAN', 'CLIENT', 'any'], default: 'any' },
    order: { type: Number, default: 0 }
  }],
  expectedDeliverables: [{
    name: String,
    description: String,
    templateUrl: String
  }],
  guides: [{
    title: String,
    content: String,
    type: { type: String, enum: ['text', 'video', 'document'], default: 'text' },
    url: String
  }],
  communityLearnings: [{
    category: { type: String, enum: ['technical', 'process', 'client', 'safety', 'other'] },
    insight: String,
    projectId: String,
    projectName: String,
    author: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true })

MilestoneKnowledgeSchema.index({ phaseTemplate: 1, serviceType: 1 })

export default mongoose.models.MilestoneKnowledge || mongoose.model<IMilestoneKnowledge>('MilestoneKnowledge', MilestoneKnowledgeSchema)
