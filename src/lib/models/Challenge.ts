import mongoose, { Schema, Document } from 'mongoose'

export interface IChallenge extends Document {
  slug: string
  title: string
  description: string
  icon: string
  grainsReward: number
  action: 'share' | 'review' | 'invite' | 'order' | 'group_join' | 'favorite' | 'visit'
  targetCount: number
  active: boolean
  startAt?: Date
  endAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ChallengeSchema = new Schema<IChallenge>({
  slug: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: 'star' },
  grainsReward: { type: Number, required: true },
  action: { type: String, enum: ['share', 'review', 'invite', 'order', 'group_join', 'favorite', 'visit'], required: true },
  targetCount: { type: Number, default: 1 },
  active: { type: Boolean, default: true },
  startAt: { type: Date },
  endAt: { type: Date },
}, { timestamps: true })

const Challenge = (mongoose.models.Challenge as mongoose.Model<IChallenge>) ||
  mongoose.model<IChallenge>('Challenge', ChallengeSchema)

export default Challenge
