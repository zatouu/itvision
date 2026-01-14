/**
 * API pour soumettre un litige sur une transaction escrow
 * POST /api/escrow/[reference]/dispute
 */
import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { openDispute } from '@/lib/escrow-service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    await dbConnect()
    const { reference } = await params
    const body = await request.json()

    const { reason, description, photos = [] } = body

    if (!reason || !description) {
      return NextResponse.json(
        { error: 'Raison et description requises' },
        { status: 400 }
      )
    }

    try {
      const result = await openDispute(reference, {
        reason,
        description,
        evidence: photos
      })

      return NextResponse.json({
        success: true,
        message: 'Litige ouvert avec succès'
      })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Erreur lors de la soumission' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Erreur API dispute:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
