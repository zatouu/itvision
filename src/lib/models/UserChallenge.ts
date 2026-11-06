import mongoose, { Schema, Document } from 'mongoose'

export interface IUserChallenge extends Document {
  userId: mongoose.Types.ObjectId
  challengeId: mongoose.Types.ObjectId
  progress: number
  targetCount: number
  completed: boolean
  claimed: boolean
  claimedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const UserChallengeSchema = new Schema<IUserChallenge>({
  userId: { type: Schema.Types.ObjectId, required: true, },
  challengeId: { type: Schema.Types.ObjectId, required: true, ref: 'Challenge' },
  progress: { type: Number, default: 0 },
  targetCount: { type: Number, required: true },
  completed: { type: Boolean, default: false },
  claimed: { type: Boolean, default: false },
  claimedAt: { type: Date },
}, { timestamps: true })

UserChallengeSchema.index({ userId: 1, challengeId: 1 }, { unique: true })

const UserChallenge = (mongoose.models.UserChallenge as mongoose.Model<IUserChallenge>) ||
  mongoose.model<IUserChallenge>('UserChallenge', UserChallengeSchema)

export default UserChallenge
