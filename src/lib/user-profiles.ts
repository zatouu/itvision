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
  if (role === 'TECHNICIAN') {
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
