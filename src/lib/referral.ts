import { connectMongoose } from './mongoose'
import User from './models/User'

const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I, O, 0, 1 pour éviter la confusion

export function generateReferralCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += ALPHANUM.charAt(Math.floor(Math.random() * ALPHANUM.length))
  }
  return code
}

/** Generate a unique referral code, retrying if collision */
export async function createUniqueReferralCode(maxRetries = 5): Promise<string> {
  await connectMongoose()
  for (let i = 0; i < maxRetries; i++) {
    const code = generateReferralCode()
    const existing = await User.findOne({ referralCode: code }).lean()
    if (!existing) return code
  }
  throw new Error('Impossible de générer un code de parrainage unique')
}

/** Validate a referral code and return the referrer user */
export async function validateReferralCode(code: string): Promise<{ userId: string; name: string } | null> {
  if (!code || typeof code !== 'string' || code.length < 4) return null
  await connectMongoose()
  const referrer = await User.findOne({ referralCode: code.toUpperCase().trim() }, '_id name').lean()
  if (!referrer) return null
  return { userId: String(referrer._id), name: referrer.name }
}

/** Credit the referrer when a referred user completes their first mission */
export async function creditReferrerOnFirstMission(userId: string, rewardAmount = 1000): Promise<boolean> {
  await connectMongoose()
  const user = await User.findById(userId).lean() as any
  if (!user || !user.referredBy) return false

  // Check if this is the first completed mission for this user
  const ServiceRequest = (await import('./models/ServiceRequest')).default
  const completedCount = await ServiceRequest.countDocuments({
    clientId: String(userId),
    status: 'completed',
  })

  if (completedCount !== 1) return false // Not the first one

  // Credit the referrer
  const referrer = await User.findOneAndUpdate(
    { referralCode: user.referredBy },
    { $inc: { referralBalance: rewardAmount, referralCount: 1 } },
    { new: true }
  )

  if (!referrer) return false

  // Crédit miroir en points dans le wallet (cohérence écosystème)
  try {
    const { creditPoints, getAppConfig } = await import('./wallet')
    const cfg = await getAppConfig()
    const bonusPoints = cfg.monetization.referralBonusPoints
    if (bonusPoints > 0) {
      await creditPoints(String(referrer._id), bonusPoints, 'referral_bonus', {
        description: `Parrainage validé (${user.name || 'filleul'})`,
      })
    }
  } catch (err) {
    console.error('[referral] Erreur crédit points parrainage', err)
  }

  return true
}
