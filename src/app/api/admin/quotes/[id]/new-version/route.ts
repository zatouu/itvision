import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { logAuditEvent } from '@/lib/audit'

const VERSIONABLE = ['sent', 'accepted', 'rejected']

/**
 * POST /api/admin/quotes/[id]/new-version
 * Duplique un devis émis en brouillon "DEV-AAAA-NNNN-Vn" ; l'original est marqué remplacé
 * (le client ne peut plus l'accepter) et reste consultable.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  await connectMongoose()
  const source = await AdminQuote.findById(id).lean() as any
  if (!source) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
  if (source.supersededById) {
    return NextResponse.json({ error: 'Une version plus récente existe déjà', quoteId: String(source.supersededById) }, { status: 409 })
  }
  if (!VERSIONABLE.includes(source.status)) {
    return NextResponse.json({ error: 'Un brouillon se modifie directement' }, { status: 409 })
  }
  if (await AdminInvoice.exists({ quoteId: String(source._id), status: { $ne: 'cancelled' } })) {
    return NextResponse.json({ error: 'Ce devis est déjà facturé : corrigez par un avoir sur la facture' }, { status: 409 })
  }

  const version = (Number(source.version) || 1) + 1
  const rootNumero = String(source.numero).replace(/-V\d+$/, '')
  const newId = new mongoose.Types.ObjectId()

  // Réservation de l'original : deux clics ne créent pas deux versions
  const claimed = await AdminQuote.updateOne(
    { _id: source._id, status: source.status, supersededById: { $exists: false } },
    { $set: { supersededById: newId, ...(source.status === 'rejected' ? {} : { status: 'superseded' }) } }
  )
  if (claimed.modifiedCount === 0) {
    return NextResponse.json({ error: 'Le devis a été modifié entre-temps, rechargez' }, { status: 409 })
  }

  try {
    const {
      _id, __v, createdAt, updatedAt, status, sentAt, acceptedAt, rejectedAt,
      clientResponse, clientRespondedAt, clientCounterAmount, clientSignature, clientComments,
      supersededById, ...rest
    } = source
    const quote = await AdminQuote.create({
      ...rest,
      _id: newId,
      numero: `${rootNumero}-V${version}`,
      version,
      previousVersionId: source._id,
      status: 'draft',
      date: new Date(),
      createdBy: auth.user.id,
    })

    void logAuditEvent({
      entityType: 'AdminQuote',
      entityId: quote._id,
      action: 'new_version',
      userId: auth.user.id,
      userRole: auth.user.role,
      metadata: { from: source.numero, to: quote.numero },
    })

    return NextResponse.json({ success: true, quote: quote.toObject() }, { status: 201 })
  } catch (error) {
    await AdminQuote.updateOne(
      { _id: source._id, supersededById: newId },
      { $set: { status: source.status }, $unset: { supersededById: 1 } }
    ).catch(() => {})
    console.error('Erreur POST /api/admin/quotes/[id]/new-version:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la version' }, { status: 500 })
  }
}
