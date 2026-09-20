import { NextResponse } from 'next/server'
import VendorProfile from '@/lib/models/VendorProfile'
import Shop from '@/lib/models/Shop'
import User from '@/lib/models/User'
import { setAuthCookie } from '@/lib/auth-server'
import { signAuthTokenWithExpiry } from '@/lib/jwt'
import { keycloakEnabled } from '@/lib/keycloak'
import { resolveUserCategory } from '@/lib/user-segmentation'

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Réconcilie un compte vendeur : si l'utilisateur possède une boutique
 * (Shop.ownerId ou Shop.ownerEmail = son email) sans VendorProfile,
 * on provisionne le profil et on promeut le rôle VENDOR.
 *
 * Couvre les boutiques créées par un admin (/api/shops) ou avant le
 * flux unifié d'inscription. Idempotent — retourne le profil existant
 * s'il est déjà là.
 */
export async function reconcileVendorAccount(userId: string): Promise<{ vendor: any; healed: boolean } | null> {
  const existing = await VendorProfile.findOne({ userId }).lean() as any
  if (existing) return { vendor: existing, healed: false }

  const user = await User.findById(userId)
  if (!user) return null

  const orphan = await Shop.findOne({
    status: { $ne: 'suspended' },
    $or: [
      { ownerId: user._id },
      ...(user.email ? [{ ownerEmail: { $regex: `^${escapeRegex(user.email)}$`, $options: 'i' } }] : []),
    ],
  }).sort({ createdAt: 1 }) as any
  if (!orphan) return null

  // name = nom de la boutique → le hook VendorProfile génère slug = shop.slug
  // (sauf collision avec un autre profil vendeur, alors on conserve le lien via ownerId)
  let vendor: any
  try {
    vendor = await VendorProfile.create({
      userId: user._id,
      name: orphan.name,
      slug: orphan.slug,
      description: orphan.description,
      logo: orphan.logo,
      banner: orphan.coverImage,
      contactEmail: orphan.ownerEmail || user.email,
      contactPhone: orphan.ownerPhone || user.phone,
      verified: !!orphan.isVerified,
      rating: 0,
      commissionRate: orphan.commissionRate ?? 0,
    })
  } catch (e: any) {
    if (e?.code === 11000) {
      // Course ou doublon : re-lecture
      const again = await VendorProfile.findOne({ userId }).lean() as any
      if (again) return { vendor: again, healed: false }
    }
    throw e
  }

  orphan.ownerId = user._id
  await orphan.save()

  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    user.role = 'VENDOR'
  }
  user.vendorProfileId = vendor._id
  await user.save()

  return { vendor: vendor.toObject ? vendor.toObject() : vendor, healed: true }
}

/** Requête boutique d'un vendeur : par slug (cas nominal) ou ownerId
 *  (fallback si le hook VendorProfile a suffixé le slug sur collision).
 *  Retourne la requête — chaînable avec .select()/.lean(). */
export function vendorShopQuery(vendor: any, userId: string) {
  return Shop.findOne({
    $or: [{ slug: vendor.slug }, { ownerId: userId }],
  }).sort({ createdAt: 1 })
}

/** Réémet le JWT après promotion VENDOR pour que le middleware laisse passer
 *  sans forcer une reconnexion (inutile sous Keycloak : rôles dans les claims). */
export async function reissueAuthCookie(response: NextResponse, user: any, role = 'VENDOR') {
  if (keycloakEnabled()) return
  try {
    const companyClientId = user.companyClientId ? String(user.companyClientId) : undefined
    const userCategory = resolveUserCategory({ role, companyClientId, email: user.email, username: user.username })
    const token = await signAuthTokenWithExpiry(
      {
        userId: String(user._id),
        email: user.email,
        role,
        username: user.username,
        marketplaceTier: user.marketplaceTier || 'standard',
        userCategory,
        ...(companyClientId ? { companyClientId } : {}),
      },
      '7d'
    )
    setAuthCookie(response, token)
  } catch (e) {
    console.error('[vendor] JWT reissue failed:', e)
  }
}
