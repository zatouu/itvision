/**
 * Xeuy Bi — création d'utilisateur mobile.
 * Ne crée PAS de MarketplaceProfile ni de CorporateProfile.
 * Crée uniquement un ProviderProfile si role === 'PROVIDER'.
 */

import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import ProviderProfile from '@/lib/models/ProviderProfile'
import type { XeuyRole, XeuyUser } from '../types'

const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateReferralCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += ALPHANUM.charAt(Math.floor(Math.random() * ALPHANUM.length))
  }
  return code
}

/** Generate a unique referral code checking only the User collection */
export async function createXeuyReferralCode(maxRetries = 5): Promise<string> {
  await connectMongoose()
  for (let i = 0; i < maxRetries; i++) {
    const code = generateReferralCode()
    const existing = await User.findOne({ referralCode: code }).lean()
    if (!existing) return code
  }
  throw new Error('Impossible de générer un code de parrainage unique')
}

/** Validate a referral code against the User collection only */
export async function validateXeuyReferralCode(code: string): Promise<{ userId: string; name: string } | null> {
  if (!code || typeof code !== 'string' || code.length < 4) return null
  await connectMongoose()
  const referrer = await User.findOne(
    { referralCode: code.toUpperCase().trim() },
    '_id name'
  ).lean()
  if (!referrer) return null
  return { userId: String(referrer._id), name: referrer.name }
}

export interface CreateXeuyUserInput {
  phone: string
  name?: string
  role: XeuyRole
  referralCode?: string
}

export async function createXeuyUser(input: CreateXeuyUserInput): Promise<XeuyUser> {
  await connectMongoose()

  const { phone, role, referralCode } = input
  const displayName = input.name?.trim()?.slice(0, 100) || phone

  // Validate referral if provided
  let referredBy: string | undefined
  if (referralCode) {
    const referrer = await validateXeuyReferralCode(referralCode)
    if (referrer) referredBy = referralCode.toUpperCase().trim()
  }

  const newReferralCode = await createXeuyReferralCode()

  const newUser = await User.create({
    username: `mobile_${phone.replace('+', '')}`,
    email: `${phone.replace('+', '')}@xeuy.bi`,
    passwordHash: '___otp_only___',
    name: displayName,
    phone,
    role,
    isActive: true,
    loginAttempts: 0,
    referralCode: newReferralCode,
    referredBy,
    referralBalance: 0,
    referralCount: 0,
  })

  // Create ProviderProfile only for PROVIDER role
  let providerProfileId: string | undefined
  if (role === 'PROVIDER') {
    const profile = await ProviderProfile.create({
      userId: newUser._id,
      kycVerified: false,
      providerStats: {
        completedMissions: 0,
        cancelledByProvider: 0,
        cancelledByClient: 0,
        reliabilityScore: 100,
      },
    })
    providerProfileId = String(profile._id)
    await User.findByIdAndUpdate(newUser._id, { $set: { providerProfileId: profile._id } })
  }

  // Update referrer if applicable (best-effort)
  if (referredBy) {
    try {
      const referrer = await User.findOne({ referralCode: referredBy })
      if (referrer) {
        await User.updateOne(
          { _id: referrer._id },
          { $addToSet: { referrals: newUser._id }, $inc: { referralCount: 1 } }
        )
      }
    } catch {
      // non-bloquant
    }
  }

  return {
    _id: String(newUser._id),
    phone,
    name: displayName,
    role,
    referralCode: newReferralCode,
    referralBalance: 0,
    referralCount: 0,
    referredBy,
    isActive: true,
    providerProfileId,
    isNew: true,
  }
}

/** Find an existing Xeuy user by phone */
export async function findXeuyUserByPhone(phone: string): Promise<XeuyUser | null> {
  await connectMongoose()
  const user = await User.findOne({ phone }).lean() as any
  if (!user) return null
  return {
    _id: String(user._id),
    phone: user.phone,
    name: user.name || user.phone,
    role: (user.role === 'PROVIDER' ? 'PROVIDER' : 'CLIENT') as XeuyRole,
    referralCode: user.referralCode,
    referralBalance: user.referralBalance || 0,
    referralCount: user.referralCount || 0,
    referredBy: user.referredBy,
    isActive: user.isActive,
    providerProfileId: user.providerProfileId ? String(user.providerProfileId) : undefined,
  }
}
