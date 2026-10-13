import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { isInternalCall } from '@/lib/internal-auth'
import { ensureAmbassadorCode } from '@/lib/market/ambassador'

export const dynamic = 'force-dynamic'

/**
 * POST /api/internal/market/ambassador-code { userId } → { code }
 * Code ambassadeur DDM+ d'un utilisateur (créé à la première demande) : un prestataire Xeuy qui
 * recommande du matériel touche la commission ambassadeur sur l'achat de son client.
 */
export async function POST(request: NextRequest) {
  if (!isInternalCall(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  if (!mongoose.Types.ObjectId.isValid(userId)) return NextResponse.json({ error: 'userId invalide' }, { status: 400 })
  try {
    await connectMongoose()
    return NextResponse.json({ code: await ensureAmbassadorCode(userId) })
  } catch (err) {
    console.error('[POST /api/internal/market/ambassador-code]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
