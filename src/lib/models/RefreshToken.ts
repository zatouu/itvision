/**
 * RefreshToken — stocke les refresh tokens Xeuy en DB pour permettre:
 * - Révocation (logout, compromission)
 * - Rotation (un seul usage par refresh token)
 * - Device binding (un token lié à un device)
 * - Token family tracking (détecte le vol de token)
 */
import mongoose from 'mongoose'

const REFRESH_TOKEN_TTL_DAYS = 30

const RefreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  familyId: { type: String, required: true, index: true },
  deviceId: { type: String, required: true, index: true },
  role: { type: String, enum: ['CLIENT', 'PROVIDER'], required: true },
  phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 },
  revokedAt: { type: Date, default: null },
  revokedReason: { type: String, default: null },
  replacedBy: { type: String, default: null },
})

RefreshTokenSchema.index({ userId: 1, deviceId: 1, revokedAt: 1 })

export default mongoose.models.RefreshToken || mongoose.model('RefreshToken', RefreshTokenSchema)
