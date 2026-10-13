import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Payment from '@/lib/models/Payment'
import User from '@/lib/models/User'
import MissionAuditLog from '@/lib/models/MissionAuditLog'
import DisputeEvidence from '@/lib/models/DisputeEvidence'
import { listThreadMessages, toMissionMessageDto } from '@/lib/messaging/thread-messages'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await connectMongoose()
    const { id } = await params

    const sr = await ServiceRequest.findById(id).lean() as any
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    const [clientUser, providerUser, payments, auditLogs, evidence, messages] = await Promise.all([
      sr.clientId ? User.findById(sr.clientId).select('name phone email').lean() : null,
      sr.assignedProviderId ? User.findById(sr.assignedProviderId).select('name phone email').lean() : null,
      Payment.find({ requestId: id }).sort({ createdAt: 1 }).lean(),
      MissionAuditLog.find({ requestId: id }).sort({ createdAt: -1 }).lean(),
      DisputeEvidence.find({ requestId: id }).sort({ createdAt: -1 }).lean(),
      listThreadMessages('mission_dispute', id, { limit: 500 }),
    ])

    return NextResponse.json({
      item: {
        ...sr,
        clientName: clientUser?.name,
        clientPhone: clientUser?.phone,
        clientEmail: (clientUser as any)?.email,
        providerName: providerUser?.name,
        providerPhone: providerUser?.phone,
        providerEmail: (providerUser as any)?.email,
      },
      payments,
      auditLogs,
      evidence,
      messages: messages.map(toMissionMessageDto),
    })
  } catch (error: any) {
    console.error('[GET /api/admin/services/disputes/:id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
