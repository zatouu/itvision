import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import KycRequest from '@/lib/models/KycRequest'
import User from '@/lib/models/User'
import { sendPushToUser } from '@/lib/push'
import { syncUserToProfiles } from '@/lib/user-profiles'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { role } = await requireAuth(request)
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const query: any = {}
    if (status !== 'all') query.status = status

    const items = await KycRequest.find(query)
      .sort({ status: 1, createdAt: -1 })
      .lean()

    const providerIds = items.map((i: any) => i.providerId).filter(Boolean)
    const users = await User.find({ _id: { $in: providerIds } })
      .select('phone name email kycVerified')
      .lean()
    const userById = new Map(users.map((u: any) => [String(u._id), u]))

    const enriched = items.map((kyc: any) => {
      const user = userById.get(String(kyc.providerId))
      return {
        ...kyc,
        providerPhone: user?.phone || '',
        providerName: user?.name || kyc.fullName || '',
        providerEmail: user?.email || '',
        kycVerified: user?.kycVerified || false,
      }
    })

    return NextResponse.json({ success: true, items: enriched })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/admin/kyc]', e)
    return NextResponse.json({ error: 'Erreur liste KYC' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await requireAuth(request)
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 })
    }

    const body = await request.json()
    const { id, action, rejectionReason } = body
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'id + action (approve/reject) requis' }, { status: 400 })
    }

    const kyc = await KycRequest.findById(id)
    if (!kyc) return NextResponse.json({ error: 'KYC introuvable' }, { status: 404 })

    if (action === 'approve') {
      kyc.status = 'approved'
      kyc.rejectionReason = ''
      kyc.reviewedBy = userId
      kyc.reviewedAt = new Date()
      await kyc.save()
      await User.findByIdAndUpdate(kyc.providerId, { kycVerified: true })
      await syncUserToProfiles(kyc.providerId)
      await sendPushToUser(String(kyc.providerId), {
        title: '✅ Profil vérifié !',
        body: 'Votre KYC a été approuvé. Vous avez maintenant le badge Vérifié.',
        data: { type: 'kyc:approved' },
        appType: 'provider',
      })
    } else {
      kyc.status = 'rejected'
      kyc.rejectionReason = rejectionReason || 'Documents non conformes'
      kyc.reviewedBy = userId
      kyc.reviewedAt = new Date()
      await kyc.save()
      await User.findByIdAndUpdate(kyc.providerId, { kycVerified: false })
      await syncUserToProfiles(kyc.providerId)
      await sendPushToUser(String(kyc.providerId), {
        title: '❌ KYC refusé',
        body: kyc.rejectionReason,
        data: { type: 'kyc:rejected' },
        appType: 'provider',
      })
    }

    return NextResponse.json({ success: true, kyc })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[PATCH /api/admin/kyc]', e)
    return NextResponse.json({ error: 'Erreur review KYC' }, { status: 500 })
  }
}
