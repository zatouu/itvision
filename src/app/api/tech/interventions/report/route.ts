import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'
import { requireAuth } from '@/lib/jwt'
import { logAuditEvent } from '@/lib/audit'
import { emitCompanyEvent, emitInterventionUpdate } from '@/lib/socket-emit'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { resolveTechnicianId, isAssignedTechnician } from '@/lib/interventions-access'
import { notifyCompany, resolveClientCompanyId } from '@/lib/portal/company-notify'

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
      const techId = await resolveTechnicianId(email)
      if (!isAssignedTechnician(intervention, techId)) {
        return NextResponse.json({ error: 'Intervention non assignée à ce technicien' }, { status: 403 })
      }
    }

    if (!['scheduled', 'in_progress', 'completed'].includes(intervention.status)) {
      return NextResponse.json({ error: 'Rapport impossible sur une intervention non planifiée ou annulée' }, { status: 409 })
    }

    const $push: any = {}
    const $set: any = {}
    let replayed = false

    for (const key of ['photosAvant', 'photosApres'] as const) {
      const list = Array.isArray(body[key]) ? body[key] : []
      // Envoi rejoué (file hors ligne) : une URL déjà rattachée n'est pas ajoutée deux fois
      const already = new Set(((intervention as any)[key] || []).map((p: any) => p?.url))
      const candidates = list.filter((p: any) => p && isValidPhotoUrl(p.url))
      if (candidates.some((p: any) => already.has(p.url))) replayed = true
      const valid = candidates
        .filter((p: any) => !already.has(p.url))
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
      if (!['in_progress', 'completed'].includes(intervention.status)) {
        return NextResponse.json({ error: 'La signature du client se recueille une fois l\u2019intervention démarrée' }, { status: 409 })
      }
      const existing = intervention.signatures?.client?.signature
      if (existing && existing === body.signatureClient.signature) {
        replayed = true
      } else if (existing) {
        // Même effet que la validation depuis le portail : on ne remplace pas un bon déjà signé
        return NextResponse.json({ error: 'Le bon est déjà signé par le client' }, { status: 409 })
      } else {
        $set['signatures.client'] = {
          signature: body.signatureClient.signature,
          name: String(body.signatureClient.name || '').slice(0, 120),
          title: String(body.signatureClient.title || '').slice(0, 120),
          timestamp: new Date(),
        }
        $set.clientAcknowledgedAt = new Date()
      }
    }

    if (!Object.keys($push).length && !Object.keys($set).length) {
      if (replayed) return NextResponse.json({ success: true, alreadyApplied: true })
      return NextResponse.json({ error: 'Aucune donnée à enregistrer' }, { status: 400 })
    }

    const filter: any = { _id: interventionId }
    if ($set['signatures.client']) filter['signatures.client.signature'] = { $in: [null, ''] }
    const write = await Intervention.updateOne(filter, { ...(Object.keys($push).length ? { $push } : {}), $set })
    if (write.matchedCount === 0) {
      return NextResponse.json({ error: 'Le bon est déjà signé par le client' }, { status: 409 })
    }

    const updated = await Intervention.findById(interventionId)
    if (updated?.addHistoryEntry) {
      updated.addHistoryEntry('report_updated', String(userId), {
        photos: (Object.keys($push) as string[]).join(',') || undefined,
        observations: !!$set.observations,
        signatureClient: !!$set['signatures.client'],
      })
      await updated.save()
    }

    // Temps réel + notification vers l'entreprise cliente (droits, préférences et push gérés par notifyCompany)
    const companyId = await resolveClientCompanyId(intervention.clientId)
    if (companyId) {
      emitCompanyEvent(companyId, 'corp:intervention:updated', {
        interventionId: String(intervention._id),
        title: intervention.title,
        status: intervention.status,
      })
      const signedOnSite = !!$set['signatures.client']
      // Pendant l'intervention, les ajouts de photos restent silencieux : la fin d'intervention notifie déjà
      if (signedOnSite || intervention.status === 'completed') {
        await notifyCompany({
          companyId,
          category: 'intervention',
          type: signedOnSite ? 'success' : 'info',
          title: signedOnSite ? `Bon signé sur place : ${intervention.title}` : `Compte rendu complété : ${intervention.title}`,
          message: signedOnSite
            ? `Signé par ${$set['signatures.client'].name || 'votre représentant'}. Le compte rendu et les photos sont disponibles.`
            : 'Le technicien a ajouté des photos ou des observations au compte rendu.',
          actionUrl: `/portail-entreprise/interventions/${intervention._id}`,
          metadata: { interventionId: String(intervention._id) },
          push: signedOnSite,
        })
      }
    }
    emitInterventionUpdate(String(intervention._id), { id: String(intervention._id), status: intervention.status })

    void logAuditEvent({
      entityType: 'Intervention',
      entityId: String(intervention._id),
      action: 'report_updated',
      userId: String(userId),
      userRole: role,
      clientCompanyId: companyId || undefined,
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
