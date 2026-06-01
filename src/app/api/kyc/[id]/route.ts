import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import KycRequest from '@/lib/models/KycRequest'
import User from '@/lib/models/User'
import { sendPushToUser } from '@/lib/push'

/**
 * Admin endpoint to approve/reject KYC requests.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId, role } = await requireAuth(request)
    const { id } = await params

    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 })
    }

    const body = await request.json()
    const { action, rejectionReason } = body

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action: approve ou reject' }, { status: 400 })
    }

    const kyc = await KycRequest.findById(id)
    if (!kyc) return NextResponse.json({ error: 'KYC introuvable' }, { status: 404 })

    if (action === 'approve') {
      kyc.status = 'approved'
      kyc.reviewedBy = userId
      kyc.reviewedAt = new Date()
      await kyc.save()

      // Mark user as verified
      await User.findByIdAndUpdate(kyc.providerId, { kycVerified: true })

      void sendPushToUser(String(kyc.providerId), {
        title: '✅ Profil vérifié !',
        body: 'Votre KYC a été approuvé. Vous avez maintenant le badge Vérifié.',
        data: { type: 'kyc:approved' },
      })
    } else {
      kyc.status = 'rejected'
      kyc.rejectionReason = rejectionReason || 'Documents non conformes'
      kyc.reviewedBy = userId
      kyc.reviewedAt = new Date()
      await kyc.save()

      void sendPushToUser(String(kyc.providerId), {
        title: '❌ KYC refusé',
        body: kyc.rejectionReason,
        data: { type: 'kyc:rejected' },
      })
    }

    return NextResponse.json({ success: true, kyc })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[PATCH /api/kyc/:id]', e)
    return NextResponse.json({ error: 'Erreur review KYC' }, { status: 500 })
  }
}

/**
 * Admin: list all KYC requests (GET /api/kyc/:id is unused, use /api/kyc/list instead)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAuth(request)
    const { id } = await params

    const kyc = await KycRequest.findById(id).lean()
    if (!kyc) return NextResponse.json({ error: 'KYC introuvable' }, { status: 404 })

    return NextResponse.json({ kyc })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
