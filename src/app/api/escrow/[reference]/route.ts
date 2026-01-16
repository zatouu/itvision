/**
 * API publique pour consulter une transaction de garantie
 * GET /api/escrow/[reference]
 */
import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { EscrowTransaction, IEscrowTransaction } from '@/lib/models/EscrowTransaction'

function maskPhone(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 5) return phone
  const head = digits.slice(0, 3)
  const tail = digits.slice(-2)
  return `${head}****${tail}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    await dbConnect()
    const { reference } = await params

    const transaction = await EscrowTransaction.findOne({ 
      reference: reference.toUpperCase() 
    }) as IEscrowTransaction | null

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction non trouvée' },
        { status: 404 }
      )
    }

    // Retourner les infos publiques (sans données sensibles admin)
    return NextResponse.json({
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      paidAmount: transaction.paidAmount,
      client: {
        name: transaction.client.name,
        // Masquer partiellement le téléphone
        phone: maskPhone(transaction.client.phone)
      },
      timeline: transaction.timeline.map((event) => ({
        status: event.status,
        timestamp: event.timestamp,
        note: event.note
      })),
      dispute: transaction.dispute
        ? {
            openedAt: transaction.dispute.openedAt,
            reason: transaction.dispute.reason,
            resolvedAt: transaction.dispute.resolvedAt
          }
        : undefined,
      guarantees: transaction.guarantees,
      delivery: transaction.delivery ? {
        method: transaction.delivery.method,
        trackingNumber: transaction.delivery.trackingNumber,
        carrier: transaction.delivery.carrier,
        estimatedDate: transaction.delivery.estimatedDate
      } : undefined,
      deliveredAt: transaction.deliveredAt,
      verificationEndsAt: transaction.verificationEndsAt,
      createdAt: transaction.createdAt
    })

  } catch (error) {
    console.error('Erreur récupération transaction:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
