/**
 * API Admin pour gérer une transaction escrow spécifique
 * GET /api/admin/escrow/[reference] - Détails d'une transaction
 * PATCH /api/admin/escrow/[reference] - Mettre à jour le statut
 */
import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { EscrowTransaction, EscrowStatus } from '@/lib/models/EscrowTransaction'
import { updateEscrowStatus, resolveDispute } from '@/lib/escrow-service'
import { requireAdminApi } from '@/lib/api-auth'

// GET - Récupérer une transaction par référence
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await dbConnect()
    const { reference } = await params

    const transaction = await EscrowTransaction.findOne({ reference }).lean()

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(transaction)

  } catch (error) {
    console.error('Erreur API admin escrow GET:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PATCH - Mettre à jour le statut d'une transaction
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await dbConnect()
    const { reference } = await params
    const body = await request.json()

    const { status, note, trackingNumber, resolveType, refundAmount, adminNote } = body

    // Si c'est une résolution de litige
    if (resolveType) {
      try {
        const result = await resolveDispute(reference, {
          decision: resolveType as 'refund_full' | 'refund_partial' | 'replacement' | 'rejected',
          note: adminNote || 'Résolu par admin',
          refundAmount: refundAmount,
          adminId: auth.user.id
        })

        return NextResponse.json(result)
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Erreur lors de la résolution' },
          { status: 404 }
        )
      }
    }

    // Mise à jour normale du statut
    if (!status) {
      return NextResponse.json(
        { error: 'Statut requis' },
        { status: 400 }
      )
    }

    try {
      const result = await updateEscrowStatus(
        reference,
        status as EscrowStatus,
        {
          note,
          adminId: auth.user.id,
          notifyClient: true,
          deliveryInfo: trackingNumber ? { trackingNumber } : undefined
        }
      )

      return NextResponse.json(result)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('Erreur API admin escrow PATCH:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
