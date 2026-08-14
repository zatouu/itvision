import mongoose from 'mongoose'
import User from '@/lib/models/User'
import MarketplaceProfile from '@/lib/models/MarketplaceProfile'
import CorporateProfile from '@/lib/models/CorporateProfile'
import ProviderProfile from '@/lib/models/ProviderProfile'

export interface ProfileSeedData {
  referralCode?: string
  referredBy?: string
  referralBalance?: number
  referralCount?: number
  marketplaceTier?: 'standard' | 'pro' | 'reseller' | 'partner'
  companyClientId?: mongoose.Types.ObjectId | string
  company?: string
  address?: string
  city?: string
  country?: string
}

/**
 * Crée les profils spécifiques par domaine pour un nouvel utilisateur
 * et met à jour les références dans le document User.
 */
export async function createUserProfiles(
  userId: mongoose.Types.ObjectId | string,
  role: string,
  seed: ProfileSeedData = {}
) {
  const userObjectId = new mongoose.Types.ObjectId(String(userId))
  const updates: Record<string, mongoose.Types.ObjectId> = {}

  // MarketplaceProfile : tous les utilisateurs
  const marketplaceProfile = await MarketplaceProfile.create({
    userId: userObjectId,
    marketplaceTier: seed.marketplaceTier || 'standard',
    referralCode: seed.referralCode,
    referredBy: seed.referredBy,
    referralBalance: seed.referralBalance || 0,
    referralCount: seed.referralCount || 0
  })
  updates.marketplaceProfileId = marketplaceProfile._id

  // CorporateProfile : si données entreprise fournies
  if (seed.company || seed.companyClientId || seed.address || seed.city || seed.country) {
    const corporateProfile = await CorporateProfile.create({
      userId: userObjectId,
      company: seed.company,
      address: seed.address,
      city: seed.city,
      country: seed.country,
      companyClientId: seed.companyClientId ? new mongoose.Types.ObjectId(String(seed.companyClientId)) : undefined
    })
    updates.corporateProfileId = corporateProfile._id
  }

  // ProviderProfile : techniciens / prestataires
  if (role === 'TECHNICIAN' || role === 'PROVIDER') {
    const providerProfile = await ProviderProfile.create({
      userId: userObjectId,
      kycVerified: false,
      providerStats: {
        completedMissions: 0,
        cancelledByProvider: 0,
        cancelledByClient: 0,
        reliabilityScore: 100
      }
    })
    updates.providerProfileId = providerProfile._id
  }

  await User.findByIdAndUpdate(userObjectId, { $set: updates })

  return updates
}

export interface UserWithProfiles {
  user: any
  marketplaceProfile: any | null
  corporateProfile: any | null
  providerProfile: any | null
}

/**
 * Charge un utilisateur avec ses profils découplés par domaine.
 * Retourne null si l'utilisateur n'existe pas.
 */
export async function loadUserWithProfiles(
  userId: mongoose.Types.ObjectId | string
): Promise<UserWithProfiles | null> {
  const userObjectId = new mongoose.Types.ObjectId(String(userId))

  const user = await User.findById(userObjectId).lean()
  if (!user) return null

  const [marketplaceProfile, corporateProfile, providerProfile] = await Promise.all([
    user.marketplaceProfileId
      ? MarketplaceProfile.findById(user.marketplaceProfileId).lean()
      : MarketplaceProfile.findOne({ userId: userObjectId }).lean(),
    user.corporateProfileId
      ? CorporateProfile.findById(user.corporateProfileId).lean()
      : CorporateProfile.findOne({ userId: userObjectId }).lean(),
    user.providerProfileId
      ? ProviderProfile.findById(user.providerProfileId).lean()
      : ProviderProfile.findOne({ userId: userObjectId }).lean(),
  ])

  return { user, marketplaceProfile, corporateProfile, providerProfile }
}

/**
 * Synchronise les champs legacy du User vers les profils dédiés.
 * Idéal pour maintenir la cohérence pendant la migration progressive.
 * Crée le profil s'il n'existe pas.
 */
export async function syncUserToProfiles(userId: mongoose.Types.ObjectId | string) {
  const userObjectId = new mongoose.Types.ObjectId(String(userId))
  const user = await User.findById(userObjectId).lean() as any
  if (!user) return

  const profileRefs: Record<string, mongoose.Types.ObjectId> = {}

  // MarketplaceProfile
  const marketplaceUpdates: Record<string, unknown> = {
    marketplaceTier: user.marketplaceTier || 'standard',
    proRequestedAt: user.proRequestedAt,
    proValidatedAt: user.proValidatedAt,
    totalMarketplacePurchases: user.totalMarketplacePurchases || 0,
    marketplaceOrderCount: user.marketplaceOrderCount || 0,
    favoriteProductIds: user.favoriteProductIds || [],
    loyaltyTier: user.tier || 'Bronze',
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    referralBalance: user.referralBalance || 0,
    referralCount: user.referralCount || 0
  }
  const marketplaceProfile = await MarketplaceProfile.findOneAndUpdate(
    { userId: userObjectId },
    { $set: marketplaceUpdates },
    { new: true, upsert: true }
  )
  if (marketplaceProfile) profileRefs.marketplaceProfileId = marketplaceProfile._id

  // CorporateProfile
  if (user.company || user.companyClientId || user.address || user.city || user.country) {
    const corporateProfile = await CorporateProfile.findOneAndUpdate(
      { userId: userObjectId },
      {
        $set: {
          company: user.company,
          address: user.address,
          city: user.city,
          country: user.country,
          companyClientId: user.companyClientId
        }
      },
      { new: true, upsert: true }
    )
    if (corporateProfile) profileRefs.corporateProfileId = corporateProfile._id
  }

  // ProviderProfile
  if (
    user.role === 'TECHNICIAN' ||
    user.role === 'PROVIDER' ||
    user.kycVerified ||
    user.providerStats?.completedMissions ||
    user.providerStats?.cancelledByProvider ||
    user.providerStats?.cancelledByClient
  ) {
    const providerProfile = await ProviderProfile.findOneAndUpdate(
      { userId: userObjectId },
      {
        $set: {
          kycVerified: user.kycVerified || false,
          providerStats: {
            completedMissions: user.providerStats?.completedMissions || 0,
            cancelledByProvider: user.providerStats?.cancelledByProvider || 0,
            cancelledByClient: user.providerStats?.cancelledByClient || 0,
            reliabilityScore: user.providerStats?.reliabilityScore ?? 100,
            lastUpdatedAt: user.providerStats?.lastUpdatedAt
          }
        }
      },
      { new: true, upsert: true }
    )
    if (providerProfile) profileRefs.providerProfileId = providerProfile._id
  }

  if (Object.keys(profileRefs).length > 0) {
    await User.findByIdAndUpdate(userObjectId, { $set: profileRefs })
  }

  return profileRefs
}

/**
 * Synchronise les profils dédiés vers les champs legacy du User.
 * Permet la rétro-compatibilité avec les endpoints et frontends qui lisent encore User.
 */
export async function syncProfilesToUser(userId: mongoose.Types.ObjectId | string) {
  const userObjectId = new mongoose.Types.ObjectId(String(userId))
  const user = await User.findById(userObjectId).lean() as any
  if (!user) return

  const data = await loadUserWithProfiles(userObjectId)
  if (!data) return

  const userUpdates: Record<string, unknown> = {}

  if (data.marketplaceProfile) {
    const mp = data.marketplaceProfile
    userUpdates.marketplaceTier = mp.marketplaceTier || 'standard'
    userUpdates.proRequestedAt = mp.proRequestedAt
    userUpdates.proValidatedAt = mp.proValidatedAt
    userUpdates.totalMarketplacePurchases = mp.totalMarketplacePurchases || 0
    userUpdates.marketplaceOrderCount = mp.marketplaceOrderCount || 0
    userUpdates.favoriteProductIds = mp.favoriteProductIds || []
    userUpdates.tier = mp.loyaltyTier || 'Bronze'
    userUpdates.referralCode = mp.referralCode
    userUpdates.referredBy = mp.referredBy
    userUpdates.referralBalance = mp.referralBalance || 0
    userUpdates.referralCount = mp.referralCount || 0
  }

  if (data.corporateProfile) {
    const cp = data.corporateProfile
    userUpdates.company = cp.company
    userUpdates.address = cp.address
    userUpdates.city = cp.city
    userUpdates.country = cp.country
    userUpdates.companyClientId = cp.companyClientId
  }

  if (data.providerProfile) {
    const pp = data.providerProfile
    userUpdates.kycVerified = pp.kycVerified || false
    userUpdates.providerStats = {
      completedMissions: pp.providerStats?.completedMissions || 0,
      cancelledByProvider: pp.providerStats?.cancelledByProvider || 0,
      cancelledByClient: pp.providerStats?.cancelledByClient || 0,
      reliabilityScore: pp.providerStats?.reliabilityScore ?? 100,
      lastUpdatedAt: pp.providerStats?.lastUpdatedAt
    }
  }

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(userObjectId, { $set: userUpdates })
  }

  return userUpdates
}
