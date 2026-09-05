import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'
import Technician from '@/lib/models/Technician'
import InAppNotification from '@/lib/models/InAppNotification'
import { requireAuth } from '@/lib/jwt'
import { logAuditEvent } from '@/lib/audit'
import { emitCompanyEvent, emitCompanyNotification, emitInterventionUpdate } from '@/lib/socket-emit'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

const ALLOWED = ['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN']

function isValidPhotoUrl(url: string) {
  return typeof url === 'string' && /^\/(api\/)?uploads\//.test(url) && url.length < 500
}

/**
 * POST /api/tech/interventions/report
 * Rapport terrain : photos avant/après, signatures, observations, activités.
 * Body: { interventionId, photosAvant?, photosApres?, observations?, activites?,
 *         signatureTechnicien?: {name, signature}, signatureClient?: {name, title, signature} }
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimit = await applyRateLimit(request, serviceWriteRateLimiter)
    if (rateLimit) return rateLimit

    await connectMongoose()
    const { userId, role, email } = await requireAuth(request) as any
    if (!ALLOWED.includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { interventionId } = body
    if (!interventionId || !mongoose.Types.ObjectId.isValid(interventionId)) {
      return NextResponse.json({ error: 'interventionId invalide' }, { status: 400 })
    }

    const intervention = await Intervention.findById(interventionId)
    if (!intervention) {
      return NextResponse.json({ error: 'Intervention introuvable' }, { status: 404 })
    }

    // Un technicien ne peut écrire que sur SES interventions
    if (role === 'TECHNICIAN') {
      const tech = await Technician.findOne({ email: String(email).toLowerCase() }).select('_id').lean() as any
      const assigned = [intervention.technicienId, intervention.assignedTechnician]
        .map(x => x && String(x))
      if (!tech || !assigned.includes(String(tech._id))) {
        return NextResponse.json({ error: 'Intervention non assignée à ce technicien' }, { status: 403 })
      }
    }

    const $push: any = {}
    const $set: any = {}

    for (const key of ['photosAvant', 'photosApres'] as const) {
      const list = Array.isArray(body[key]) ? body[key] : []
      const valid = list
        .filter((p: any) => p && isValidPhotoUrl(p.url))
        .slice(0, 20)
        .map((p: any) => ({
          url: p.url,
          caption: String(p.caption || '').slice(0, 200),
          timestamp: new Date(),
        }))
      if (valid.length) $push[key] = { $each: valid }
    }

    if (typeof body.observations === 'string' && body.observations.trim()) {
      $set.observations = body.observations.trim().slice(0, 5000)
    }
    if (typeof body.activites === 'string' && body.activites.trim()) {
      $set.activites = body.activites.trim().slice(0, 5000)
    }

    const validSig = (s: any) =>
      s && typeof s.signature === 'string' && s.signature.startsWith('data:image/png;base64,') && s.signature.length < 600_000

    if (validSig(body.signatureTechnicien)) {
      $set['signatures.technician'] = {
        signature: body.signatureTechnicien.signature,
        name: String(body.signatureTechnicien.name || '').slice(0, 120),
        timestamp: new Date(),
      }
    }
    if (validSig(body.signatureClient)) {
      $set['signatures.client'] = {
        signature: body.signatureClient.signature,
        name: String(body.signatureClient.name || '').slice(0, 120),
        title: String(body.signatureClient.title || '').slice(0, 120),
        timestamp: new Date(),
      }
    }

    if (!Object.keys($push).length && !Object.keys($set).length) {
      return NextResponse.json({ error: 'Aucune donnée à enregistrer' }, { status: 400 })
    }

    await Intervention.updateOne({ _id: interventionId }, { ...(Object.keys($push).length ? { $push } : {}), $set })

    const updated = await Intervention.findById(interventionId)
    if (updated?.addHistoryEntry) {
      updated.addHistoryEntry('report_updated', String(userId), {
        photos: (Object.keys($push) as string[]).join(',') || undefined,
        observations: !!$set.observations,
        signatureClient: !!$set['signatures.client'],
      })
      await updated.save()
    }

    // Temps réel + notification persistante vers la société cliente
    const clientId = intervention.clientId ? String(intervention.clientId) : null
    if (clientId) {
      emitCompanyEvent(clientId, 'corp:intervention:updated', {
        interventionId: String(intervention._id),
        title: intervention.title,
        status: intervention.status,
      })
      try {
        const notif = await InAppNotification.create({
          teamId: clientId,
          roles: ['CLIENT'],
          type: 'info',
          title: 'Rapport d\u2019intervention mis à jour',
          message: intervention.title,
          actionUrl: `/portail-entreprise/interventions/${intervention._id}`,
        })
        emitCompanyNotification(clientId, {
          _id: String(notif._id),
          type: 'info',
          title: notif.title,
          message: notif.message,
          actionUrl: notif.actionUrl,
          createdAt: notif.createdAt,
          readBy: [],
        })
      } catch (e) {
        console.error('[report] notification:', e)
      }
    }
    emitInterventionUpdate(String(intervention._id), { id: String(intervention._id), status: intervention.status })

    void logAuditEvent({
      entityType: 'Intervention',
      entityId: String(intervention._id),
      action: 'report_updated',
      userId: String(userId),
      userRole: role,
      clientCompanyId: clientId || undefined,
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: { title: intervention.title },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/tech/interventions/report]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
