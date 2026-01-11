import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

// ============================================================================
// API - MARQUER UN AVIS COMME UTILE
// ============================================================================
// 
// POST /api/products/[id]/reviews/[reviewId]/helpful
// Body: { helpful: boolean }
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const { id: productId, reviewId } = await params
    
    // Vérifier l'authentification (optionnel - peut permettre aux anonymes)
    const session = await getServerSession()
    const userId = session?.user ? (session.user as any).id : request.headers.get('x-anonymous-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Identification requise', code: 'NO_USER_ID' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { helpful } = body
    
    if (typeof helpful !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Paramètre "helpful" requis (boolean)', code: 'INVALID_PARAM' },
        { status: 400 }
      )
    }
    
    // TODO: Implémenter la logique MongoDB
    // 1. Vérifier que l'avis existe
    // const review = await ReviewModel.findById(reviewId)
    // if (!review) return 404
    
    // 2. Vérifier si l'utilisateur a déjà voté
    // const existingVote = await ReviewVoteModel.findOne({ reviewId, oderId })
    
    // 3. Créer ou mettre à jour le vote
    // if (existingVote) {
    //   if (existingVote.helpful === helpful) {
    //     // Annuler le vote
    //     await ReviewVoteModel.deleteOne({ _id: existingVote._id })
    //     await ReviewModel.updateOne({ _id: reviewId }, { $inc: { [helpful ? 'helpful' : 'notHelpful']: -1 } })
    //   } else {
    //     // Changer le vote
    //     await ReviewVoteModel.updateOne({ _id: existingVote._id }, { helpful })
    //     await ReviewModel.updateOne({ _id: reviewId }, { 
    //       $inc: { 
    //         helpful: helpful ? 1 : -1,
    //         notHelpful: helpful ? -1 : 1
    //       }
    //     })
    //   }
    // } else {
    //   // Nouveau vote
    //   await ReviewVoteModel.create({ reviewId, oderId, helpful })
    //   await ReviewModel.updateOne({ _id: reviewId }, { $inc: { [helpful ? 'helpful' : 'notHelpful']: 1 } })
    // }
    
    // Mock response
    return NextResponse.json({
      success: true,
      data: {
        reviewId,
        productId,
        action: helpful ? 'marked_helpful' : 'marked_not_helpful',
        newCounts: {
          helpful: 25, // Mock - récupérer du DB
          notHelpful: 2
        }
      },
      message: helpful ? 'Merci pour votre retour !' : 'Retour enregistré'
    })
    
  } catch (error) {
    console.error('[API] Review helpful error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du vote' },
      { status: 500 }
    )
  }
}
