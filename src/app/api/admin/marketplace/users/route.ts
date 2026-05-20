import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    const role = auth.role?.toUpperCase()
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    await connectMongoose()

    // Retourner les utilisateurs qui ont soit un tier non-standard,
    // soit une demande Pro en attente, soit au moins 1 commande marketplace
    const users = await User.find({
      $or: [
        { marketplaceTier: { $ne: 'standard', $exists: true } },
        { proRequestedAt: { $exists: true, $ne: null } },
        { marketplaceOrderCount: { $gte: 1 } },
      ],
    })
      .select('name email phone marketplaceTier marketplaceOrderCount totalMarketplacePurchases proRequestedAt proValidatedAt')
      .sort({ proRequestedAt: -1, totalMarketplacePurchases: -1 })
      .limit(200)
      .lean()

    return NextResponse.json({
      success: true,
      users: users.map((u: any) => ({
        _id: String(u._id),
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        marketplaceTier: u.marketplaceTier || 'standard',
        marketplaceOrderCount: u.marketplaceOrderCount || 0,
        totalMarketplacePurchases: u.totalMarketplacePurchases || 0,
        proRequestedAt: u.proRequestedAt || null,
        proValidatedAt: u.proValidatedAt || null,
      })),
    })
  } catch (error) {
    console.error('Erreur admin marketplace users:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
