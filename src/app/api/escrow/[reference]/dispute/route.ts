/**
 * API pour soumettre un litige sur une transaction escrow
 * POST /api/escrow/[reference]/dispute
 */
import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { EscrowTransaction } from '@/lib/models/EscrowTransaction'
import { openDispute } from '@/lib/escrow-service'
import { verifyAuthServer } from '@/lib/auth-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    await dbConnect()
    const { reference } = await params
    const body = await request.json().catch(() => ({}))

    const { reason, description, photos = [], phoneLast4 } = body

    if (!reason || !description) {
      return NextResponse.json(
        { error: 'Raison et description requises' },
        { status: 400 }
      )
    }

    const normalizedReference = String(reference || '').toUpperCase()
    const transaction = await EscrowTransaction.findOne({ reference: normalizedReference }).lean()
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction non trouvée' }, { status: 404 })
    }

    // Auth: allow owner without extra proof.
    const auth = await verifyAuthServer(request)
    const isOwner =
      auth.isAuthenticated &&
      auth.user?.id &&
      String((transaction as any).userId) === String(auth.user.id)

    if (!isOwner) {
      const storedDigits = String((transaction as any)?.client?.phone || '').replace(/\D/g, '')
      const expectedLast4 = storedDigits.slice(-4)
      const providedLast4 = String(phoneLast4 || '').replace(/\D/g, '')

      if (expectedLast4.length !== 4 || providedLast4.length !== 4 || providedLast4 !== expectedLast4) {
        return NextResponse.json(
          { error: 'Vérification requise (4 derniers chiffres du téléphone)' },
          { status: 403 }
        )
      }
    }

    try {
      await openDispute(normalizedReference, {
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
