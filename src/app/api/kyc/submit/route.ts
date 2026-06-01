import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import KycRequest from '@/lib/models/KycRequest'

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const body = await request.json()
    const { idCardFrontUrl, idCardBackUrl, selfieUrl, trade, fullName } = body

    if (!idCardFrontUrl || !selfieUrl || !trade || !fullName) {
      return NextResponse.json(
        { error: 'Photo CNI recto, selfie, métier et nom complet requis' },
        { status: 400 }
      )
    }

    // Upsert : si déjà soumis, on met à jour (sauf si déjà approuvé)
    const existing = await KycRequest.findOne({ providerId: userId })
    if (existing?.status === 'approved') {
      return NextResponse.json({ error: 'KYC déjà validé' }, { status: 400 })
    }

    const kyc = await KycRequest.findOneAndUpdate(
      { providerId: userId },
      {
        idCardFrontUrl,
        idCardBackUrl: idCardBackUrl || '',
        selfieUrl,
        trade,
        fullName,
        status: 'pending',
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return NextResponse.json({ success: true, kyc })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/kyc/submit]', e)
    return NextResponse.json({ error: 'Erreur soumission KYC' }, { status: 500 })
  }
}
