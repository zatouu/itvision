/**
 * Migration : extrait les profils spécifiques par domaine depuis le modèle User.
 * Crée les profils MarketplaceProfile, CorporateProfile et ProviderProfile
 * et met à jour les références dans User.
 *
 * Usage :
 *   npx tsx scripts/migrate-user-profiles.ts
 *   npx tsx scripts/migrate-user-profiles.ts --dry-run
 */

import { connectDB } from '../src/lib/db'
import User from '../src/lib/models/User'
import MarketplaceProfile from '../src/lib/models/MarketplaceProfile'
import CorporateProfile from '../src/lib/models/CorporateProfile'
import ProviderProfile from '../src/lib/models/ProviderProfile'

const isDryRun = process.argv.includes('--dry-run')

async function main() {
  await connectDB()

  const batchSize = 100
  let processed = 0
  let createdMarketplace = 0
  let createdCorporate = 0
  let createdProvider = 0
  let skipped = 0

  const cursor = User.find({
    $or: [
      { marketplaceProfileId: { $exists: false } },
      { corporateProfileId: { $exists: false } },
      { providerProfileId: { $exists: false } }
    ]
  }).cursor()

  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    processed++
    const updates: Record<string, unknown> = {}

    if (!user.marketplaceProfileId) {
      const hasMarketplaceData =
        user.marketplaceTier ||
        user.totalMarketplacePurchases ||
        user.marketplaceOrderCount ||
        user.referralCode ||
        user.referralBalance ||
        user.referralCount

      if (hasMarketplaceData) {
        if (!isDryRun) {
          const profile = await MarketplaceProfile.create({
            userId: user._id,
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
          })
          updates.marketplaceProfileId = profile._id
        }
        createdMarketplace++
      }
    }

    if (!user.corporateProfileId) {
      const hasCorporateData = user.company || user.companyClientId || user.address || user.city || user.country
      if (hasCorporateData) {
        if (!isDryRun) {
          const profile = await CorporateProfile.create({
            userId: user._id,
            company: user.company,
            address: user.address,
            city: user.city,
            country: user.country,
            companyClientId: user.companyClientId
          })
          updates.corporateProfileId = profile._id
        }
        createdCorporate++
      }
    }

    if (!user.providerProfileId) {
      const hasProviderData =
        user.role === 'TECHNICIAN' ||
        user.kycVerified ||
        user.providerStats?.completedMissions ||
        user.providerStats?.cancelledByProvider ||
        user.providerStats?.cancelledByClient

      if (hasProviderData) {
        if (!isDryRun) {
          const profile = await ProviderProfile.create({
            userId: user._id,
            kycVerified: user.kycVerified || false,
            providerStats: {
              completedMissions: user.providerStats?.completedMissions || 0,
              cancelledByProvider: user.providerStats?.cancelledByProvider || 0,
              cancelledByClient: user.providerStats?.cancelledByClient || 0,
              reliabilityScore: user.providerStats?.reliabilityScore ?? 100,
              lastUpdatedAt: user.providerStats?.lastUpdatedAt
            }
          })
          updates.providerProfileId = profile._id
        }
        createdProvider++
      }
    }

    if (Object.keys(updates).length > 0 && !isDryRun) {
      await User.findByIdAndUpdate(user._id, { $set: updates })
    } else {
      skipped++
    }

    if (processed % batchSize === 0) {
      console.log(`[migrate-user-profiles] Traité ${processed} utilisateurs...`)
    }
  }

  console.log(`[migrate-user-profiles] Utilisateurs traités : ${processed}`)
  console.log(`[migrate-user-profiles] Profils marketplace créés : ${createdMarketplace}`)
  console.log(`[migrate-user-profiles] Profils corporate créés : ${createdCorporate}`)
  console.log(`[migrate-user-profiles] Profils provider créés : ${createdProvider}`)
  console.log(`[migrate-user-profiles] Sans profil pertinent : ${skipped}`)

  if (isDryRun) {
    console.log('[migrate-user-profiles] Mode dry-run : aucune modification effectuée.')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('[migrate-user-profiles] Erreur :', err)
  process.exit(1)
})
