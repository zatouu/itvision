import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import ProviderProfile from '@/lib/models/ProviderProfile'

// GET /api/services/providers?category=&city=&limit=50
// Liste publique des prestataires pour le domaine services (Xeuy Bi)
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const category = (searchParams.get('category') || '').trim()
    const city = (searchParams.get('city') || '').trim()
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    const profileQuery: any = {}
    if (category) {
      profileQuery.serviceCategories = { $in: [category, new RegExp(category, 'i')] }
    }
    if (city) {
      profileQuery['zone.city'] = new RegExp(city, 'i')
    }

    const profiles = await ProviderProfile.find(profileQuery)
      .sort({ 'providerStats.reliabilityScore': -1, 'providerStats.completedMissions': -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const userIds = profiles.map((p) => p.userId)
    const users = await User.find({ _id: { $in: userIds } })
      .select('name avatarUrl phone role')
      .lean()

    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]))

    const items = profiles.map((p) => {
      const user = userMap[String(p.userId)]
      return {
        providerId: String(p._id),
        userId: String(p.userId),
        name: user?.name || '',
        avatarUrl: user?.avatarUrl,
        phone: user?.phone,
        kycVerified: p.kycVerified,
        serviceCategories: p.serviceCategories,
        zone: p.zone,
        currentLoad: p.currentLoad,
        maxConcurrentMissions: p.maxConcurrentMissions,
        stats: p.providerStats
      }
    })

    return NextResponse.json({ success: true, items, domain: 'services' })
  } catch (e) {
    console.error('[GET /api/services/providers]', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch providers' }, { status: 500 })
  }
}
