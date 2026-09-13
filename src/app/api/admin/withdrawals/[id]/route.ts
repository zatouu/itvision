import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import WithdrawalRequest from '@/lib/models/WithdrawalRequest'
import Wallet from '@/lib/models/Wallet'
import { sendPushToUser } from '@/lib/push'

/**
 * PATCH /api/admin/withdrawals/[id]
 * action: 'process' → le virement a été effectué côté opérateur (marque traité)
 * action: 'reject'  → rejet + remboursement atomique du montant réservé
 *
 * La transition est atomique (findOneAndUpdate sur status='pending') : deux
 * admins ne peuvent pas traiter/rejeter la même demande en double.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { action, rejectionReason } = body || {}
    if (!['process', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: "action: 'process' ou 'reject'" }, { status: 400 })
    }

    const nextStatus = action === 'process' ? 'processed' : 'rejected'
    const $set: any = {
      status: nextStatus,
      processedAt: new Date(),
      processedBy: auth.user.id,
    }
    if (action === 'reject') {
      $set.rejectionReason = String(rejectionReason || 'Rejeté par l\'administration').slice(0, 300)
    }

    // Transition atomique pending → processed|rejected
    const wr = await WithdrawalRequest.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { $set },
      { new: true }
    )
    if (!wr) {
      const existing = await WithdrawalRequest.findById(id).lean()
      if (!existing) return NextResponse.json({ success: false, error: 'Demande introuvable' }, { status: 404 })
      return NextResponse.json({ success: false, error: `Demande déjà ${existing.status}` }, { status: 409 })
    }

    if (action === 'reject') {
      // Rembourser la réservation prélevée à la création
      await Wallet.findOneAndUpdate(
        { userId: wr.userId },
        {
          $inc: { balance: wr.amount },
          $push: { txns: { type: 'refund', amount: wr.amount, ref: String(wr._id), meta: { description: 'Remboursement retrait rejeté' }, createdAt: new Date() } },
        }
      )
      void sendPushToUser(String(wr.userId), {
        title: '❌ Retrait refusé',
        body: `${wr.amount.toLocaleString('fr-FR')} FCFA recrédités sur votre portefeuille. ${$set.rejectionReason}`,
        data: { type: 'withdrawal:rejected', withdrawalId: String(wr._id) },
      })
    } else {
      void sendPushToUser(String(wr.userId), {
        title: '✅ Retrait effectué',
        body: `${wr.amount.toLocaleString('fr-FR')} FCFA envoyés via ${wr.method} au ${wr.phone}.`,
        data: { type: 'withdrawal:processed', withdrawalId: String(wr._id) },
      })
    }

    return NextResponse.json({ success: true, withdrawal: wr })
  } catch (e: any) {
    console.error('[PATCH /api/admin/withdrawals/:id]', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
