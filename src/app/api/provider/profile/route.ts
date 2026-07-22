import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import User from '@/lib/models/User'
import ProviderProfile from '@/lib/models/ProviderProfile'
import KycRequest from '@/lib/models/KycRequest'
import ProviderSubscription from '@/lib/models/ProviderSubscription'
import { normalizePhone } from '@/lib/sms'

function sanitizeProfile(profile: any, user: any, kyc: any, subscription: any) {
  const p = profile?.toObject ? profile.toObject() : profile || {}
  const u = user?.toObject ? user.toObject() : user || {}
  return {
    _id: String(p._id || ''),
    userId: String(u._id || ''),
    xeuyId: String(u._id || '').slice(-8).toUpperCase(),
    accountStatus: u.isActive ? 'active' : 'suspended',
    memberSince: u.createdAt,
    name: u.name || '',
    avatarUrl: u.avatarUrl || '',
    phone: u.phone || '',
    email: u.email || '',
    company: u.company || '',
    address: u.address || '',
    city: u.city || '',
    country: u.country || '',
    referralCode: u.referralCode || '',
    referralBalance: u.referralBalance || 0,
    referralCount: u.referralCount || 0,
    kycVerified: u.kycVerified || false,
    kyc: {
      status: p.kyc?.status || kyc?.status || 'none',
      phoneVerified: !!(u.phone && p.kyc?.phoneVerified),
      emailVerified: !!(u.email && p.kyc?.emailVerified),
      idVerified: !!p.kyc?.idVerified || kyc?.status === 'approved',
      selfieVerified: !!p.kyc?.selfieVerified || kyc?.status === 'approved',
      addressVerified: !!p.kyc?.addressVerified,
      rejectionReason: p.kyc?.rejectionReason || kyc?.rejectionReason || '',
    },
    personal: {
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      businessName: p.businessName || u.company || '',
      gender: p.gender || '',
      birthDate: p.birthDate ? new Date(p.birthDate).toISOString().split('T')[0] : '',
      bio: p.bio || '',
      spokenLanguages: p.spokenLanguages || [],
      experienceYears: p.experienceYears ?? 0,
    },
    categories: {
      primary: p.primaryCategorySlugs || p.serviceCategories || [],
      secondary: p.secondaryCategorySlugs || [],
      subCategories: p.subCategoriesByCategory || {},
    },
    zone: {
      city: p.zone?.city || u.city || '',
      region: p.zone?.region || '',
      country: p.zone?.country || u.country || 'Sénégal',
      departments: p.zone?.departments || [],
      regions: p.zone?.regions || [],
      radiusKm: p.zone?.radiusKm ?? 10,
      coordinates: p.zone?.coordinates || null,
    },
    availability: {
      status: p.availability?.status || 'offline',
      workingDays: p.availability?.workingDays || [1, 2, 3, 4, 5, 6],
      startTime: p.availability?.startTime || '08:00',
      endTime: p.availability?.endTime || '18:00',
      lunchStart: p.availability?.lunchStart || '13:00',
      lunchEnd: p.availability?.lunchEnd || '14:00',
      exceptions: (p.availability?.exceptions || []).map((e: any) => ({
        from: e.from ? new Date(e.from).toISOString() : '',
        to: e.to ? new Date(e.to).toISOString() : '',
        reason: e.reason || '',
      })),
    },
    missionPreferences: {
      urgent: p.missionPreferences?.urgent ?? true,
      planned: p.missionPreferences?.planned ?? true,
      troubleshooting: p.missionPreferences?.troubleshooting ?? true,
      installation: p.missionPreferences?.installation ?? true,
      maintenance: p.missionPreferences?.maintenance ?? true,
      longMissions: p.missionPreferences?.longMissions ?? true,
      shortMissions: p.missionPreferences?.shortMissions ?? true,
      minAmount: p.missionPreferences?.minAmount ?? 0,
      maxDistanceKm: p.missionPreferences?.maxDistanceKm ?? 50,
      maxDurationHours: p.missionPreferences?.maxDurationHours ?? 8,
    },
    notifications: {
      channels: {
        push: p.notifications?.channels?.push ?? true,
        sms: p.notifications?.channels?.sms ?? true,
        email: p.notifications?.channels?.email ?? false,
        call: p.notifications?.channels?.call ?? false,
      },
      events: {
        newMission: p.notifications?.events?.newMission ?? true,
        missionAssigned: p.notifications?.events?.missionAssigned ?? true,
        payment: p.notifications?.events?.payment ?? true,
        message: p.notifications?.events?.message ?? true,
        promotion: p.notifications?.events?.promotion ?? false,
        news: p.notifications?.events?.news ?? false,
        reminder: p.notifications?.events?.reminder ?? true,
      },
    },
    visibility: {
      visible: p.visibility?.visible ?? true,
      autoAcceptRequests: p.visibility?.autoAcceptRequests ?? false,
      showPhone: p.visibility?.showPhone ?? false,
      showCompany: p.visibility?.showCompany ?? true,
      showExactLocation: p.visibility?.showExactLocation ?? false,
      publicProfile: p.visibility?.publicProfile ?? true,
      showReviews: p.visibility?.showReviews ?? true,
      showAddress: p.visibility?.showAddress ?? false,
      allowAnonymousStats: p.visibility?.allowAnonymousStats ?? true,
    },
    portfolio: p.portfolio || [],
    paymentMethods: p.paymentMethods || [],
    advanced: {
      secondaryCategoriesEnabled: p.advanced?.secondaryCategoriesEnabled ?? false,
      outOfZoneFallback: p.advanced?.outOfZoneFallback ?? false,
      verifiedClientsOnly: p.advanced?.verifiedClientsOnly ?? false,
      depositOnly: p.advanced?.depositOnly ?? false,
      escrowOnly: p.advanced?.escrowOnly ?? false,
      maxConcurrentMissions: p.advanced?.maxConcurrentMissions ?? 3,
      batterySaver: p.advanced?.batterySaver ?? false,
      highAvailability: p.advanced?.highAvailability ?? false,
      autoReplyEnabled: p.advanced?.autoReplyEnabled ?? false,
      autoReplyMessage: p.advanced?.autoReplyMessage || '',
    },
    performance: {
      totalMissions: p.performance?.totalMissions ?? p.providerStats?.completedMissions ?? 0,
      completedMissions: p.performance?.completedMissions ?? p.providerStats?.completedMissions ?? 0,
      successRate: p.performance?.successRate ?? 0,
      avgResponseMinutes: p.performance?.avgResponseMinutes ?? 0,
      avgArrivalMinutes: p.performance?.avgArrivalMinutes ?? 0,
      ratingAvg: p.performance?.ratingAvg ?? 0,
      ratingCount: p.performance?.ratingCount ?? 0,
      cancellationRate: p.performance?.cancellationRate ?? 0,
      revenueFcfa: p.performance?.revenueFcfa ?? 0,
      monthlyTrend: p.performance?.monthlyTrend ?? 0,
    },
    premium: {
      tier: subscription?.tier || p.premium?.tier || 'free',
      features: subscription?.features || p.premium?.features || [],
      visibilityRadiusKm: subscription?.visibilityRadiusKm ?? p.premium?.visibilityRadiusKm ?? 10,
      priorityLevel: subscription?.priorityLevel ?? p.premium?.priorityLevel ?? 0,
      credits: subscription?.credits ?? p.premium?.credits ?? 0,
      expiresAt: subscription?.activeUntil ? new Date(subscription.activeUntil).toISOString() : p.premium?.expiresAt || null,
      autoRenewal: p.premium?.autoRenewal ?? false,
    },
    currentLoad: p.currentLoad || 0,
    maxConcurrentMissions: p.maxConcurrentMissions ?? p.advanced?.maxConcurrentMissions ?? 3,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

async function getOrCreateProfile(userId: string) {
  const user = await User.findById(userId).lean()
  if (!user) throw new Error('Utilisateur introuvable')

  let profile = await ProviderProfile.findOne({ userId })
  if (!profile) {
    profile = await ProviderProfile.create({
      userId,
      zone: { city: user.city || '', country: user.country || 'Sénégal' },
    })
    await User.findByIdAndUpdate(userId, { providerProfileId: profile._id })
  }
  return { user, profile }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await requireAuth(request)
    const { user, profile } = await getOrCreateProfile(userId)

    const kyc = await KycRequest.findOne({ providerId: String(userId) }).sort({ createdAt: -1 }).lean()
    const subscription = await ProviderSubscription.findOne({ userId }).sort({ createdAt: -1 }).lean()

    return NextResponse.json({
      success: true,
      profile: sanitizeProfile(profile, user, kyc, subscription),
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/provider/profile]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await requireAuth(request)
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { user, profile } = await getOrCreateProfile(userId)

    // User-level fields
    const userUpdate: any = {}
    const userFields = ['name', 'avatarUrl', 'phone', 'email', 'company', 'address', 'city', 'country']
    for (const key of userFields) {
      if (body[key] !== undefined) {
        if (key === 'name') userUpdate[key] = String(body[key]).slice(0, 100)
        else if (key === 'email') userUpdate[key] = String(body[key]).toLowerCase().slice(0, 200)
        else if (key === 'phone') {
          const normalized = normalizePhone(String(body[key]))
          if (normalized) userUpdate[key] = normalized
        }
        else userUpdate[key] = String(body[key]).slice(0, 200)
      }
    }

    // ProviderProfile-level fields
    const profileUpdate: any = {}
    const scalarFields = ['firstName', 'lastName', 'businessName', 'gender', 'birthDate', 'bio', 'spokenLanguages', 'experienceYears']
    for (const key of scalarFields) {
      if (body[key] !== undefined) profileUpdate[key] = body[key]
    }

    // Nested updaters
    const nestedPaths = ['personal', 'zone', 'availability', 'missionPreferences', 'notifications', 'visibility', 'advanced', 'performance', 'premium']
    for (const path of nestedPaths) {
      if (body[path] && typeof body[path] === 'object') {
        for (const [subKey, subValue] of Object.entries(body[path])) {
          profileUpdate[`${path}.${subKey}`] = subValue
        }
      }
    }

    if (body.categories) {
      const cats = body.categories as any
      if (Array.isArray(cats.primary)) {
        profileUpdate.primaryCategorySlugs = cats.primary
        profileUpdate.serviceCategories = cats.primary
      }
      if (Array.isArray(cats.secondary)) profileUpdate.secondaryCategorySlugs = cats.secondary
      if (cats.subCategories && typeof cats.subCategories === 'object') profileUpdate.subCategoriesByCategory = cats.subCategories
    }

    if (body.paymentMethods !== undefined) profileUpdate.paymentMethods = body.paymentMethods
    if (body.portfolio !== undefined) profileUpdate.portfolio = body.portfolio

    const [updatedUser, updatedProfile] = await Promise.all([
      Object.keys(userUpdate).length > 0 ? User.findByIdAndUpdate(userId, { $set: userUpdate }, { new: true }).lean() : user,
      Object.keys(profileUpdate).length > 0 ? ProviderProfile.findByIdAndUpdate(profile._id, { $set: profileUpdate }, { new: true }).lean() : profile,
    ])

    const kyc = await KycRequest.findOne({ providerId: String(userId) }).sort({ createdAt: -1 }).lean()
    const subscription = await ProviderSubscription.findOne({ userId }).sort({ createdAt: -1 }).lean()

    return NextResponse.json({
      success: true,
      profile: sanitizeProfile(updatedProfile, updatedUser, kyc, subscription),
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[PATCH /api/provider/profile]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
