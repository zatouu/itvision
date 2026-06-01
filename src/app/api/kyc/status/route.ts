import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import KycRequest from '@/lib/models/KycRequest'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    const kyc: any = await KycRequest.findOne({ providerId: userId }).lean()

    return NextResponse.json({
      status: kyc?.status || 'none',
      kyc: kyc || null,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/kyc/status]', e)
    return NextResponse.json({ error: 'Erreur KYC' }, { status: 500 })
  }
}
