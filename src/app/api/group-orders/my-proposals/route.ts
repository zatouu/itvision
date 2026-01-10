import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import { GroupOrder } from '@/lib/models/GroupOrder'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
)

/**
 * GET /api/group-orders/my-proposals
 * 
 * Récupère les propositions d'achats groupés de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : cookieToken

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise' },
        { status: 401 }
      )
    }

    let payload
    try {
      const verified = await jwtVerify(token, JWT_SECRET)
      payload = verified.payload as { userId: string }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Session expirée' },
        { status: 401 }
      )
    }

    await connectMongoose()

    // Récupérer les propositions où l'utilisateur est créateur ou participant
    const proposals = await GroupOrder.find({
      $or: [
        { 'createdBy.userId': payload.userId },
        { 'participants.userId': payload.userId }
      ]
    })
      .select('groupId status product minQty targetQty currentQty deadline proposal createdAt createdBy participants')
      .sort({ createdAt: -1 })
      .lean()

    const formattedProposals = proposals.map((p: any) => ({
      _id: p._id,
      groupId: p.groupId,
      status: p.status,
      product: {
        name: p.product?.name || 'Produit',
        image: p.product?.image,
        basePrice: p.product?.basePrice || 0,
        currency: p.product?.currency || 'FCFA'
      },
      currentQty: p.currentQty || 0,
      targetQty: p.targetQty || 0,
      deadline: p.deadline,
      proposal: p.proposal,
      createdAt: p.createdAt
    }))

    return NextResponse.json({
      success: true,
      proposals: formattedProposals,
      total: formattedProposals.length
    })

  } catch (error) {
    console.error('Error fetching my proposals:', error)
    return NextResponse.json({
      success: false,
      proposals: [],
      error: 'Erreur lors de la récupération des propositions'
    })
  }
}
