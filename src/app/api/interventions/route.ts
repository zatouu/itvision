import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Technician from '@/lib/models/Technician'
import { requireAuth } from '@/lib/jwt'
import { emitInterventionUpdate, emitUserNotification } from '@/lib/socket-emit'
import { logAuditEvent } from '@/lib/audit'

export async function requireInterventionAccess(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    const allowed = ['ADMIN', 'TECHNICIAN', 'PRODUCT_MANAGER'].includes(role)
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  }
}

// GET - Récupérer toutes les interventions
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const service = searchParams.get('service')
    const zone = searchParams.get('zone')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)
    const query: any = {}
    if (date) query.scheduledDate = date
    if (status) query.status = status
    if (service && service !== 'all') query.service = service
    if (zone && zone !== 'all') query['client.zone'] = zone

    const [items, total] = await Promise.all([
      Intervention.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Intervention.countDocuments(query)
    ])

    return NextResponse.json({ success: true, interventions: items, total })

  } catch (error) {
    console.error('Erreur API interventions:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle intervention
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireInterventionAccess(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    
    const body = await request.json()
    
    // Validation des données
    if (!body.title || !body.client || !body.service) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      )
    }

    const scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : new Date()
    const startTime = body.scheduledTime || '09:00'
    const durationHours = Number(body.estimatedDuration) || 2
    const computeEndTime = (start: string, duration: number) => {
      const [h, m] = start.split(':').map((part: string) => parseInt(part, 10))
      if (Number.isNaN(h) || Number.isNaN(m)) return '10:00'
      const date = new Date()
      date.setHours(h)
      date.setMinutes(m)
      date.setSeconds(0)
      date.setMilliseconds(0)
      date.setHours(date.getHours() + Math.max(duration, 1))
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    // Auto-détection contrat de maintenance actif
    let maintenanceContractId = undefined
    let isCoveredByContract = false
    let overageAlert = false
    if (body.clientId) {
      const now = new Date()
      const activeContract = await MaintenanceContract.findOne({
        clientId: body.clientId,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).lean() as any
      if (activeContract) {
        const used = activeContract.coverage?.interventionsUsed || 0
        const included = activeContract.coverage?.interventionsIncluded || 0
        if (included > 0 && used >= included) {
          isCoveredByContract = false
          overageAlert = true
        } else {
          maintenanceContractId = activeContract._id
          isCoveredByContract = true
        }
      }
    }

    const created = await Intervention.create({
      title: body.title,
      description: body.description || '',
      client: body.client,
      service: body.service,
      priority: body.priority || 'medium',
      estimatedDuration: durationHours,
      requiredSkills: body.requiredSkills || [],
      status: 'pending',
      projectId: body.projectId || undefined,
      typeIntervention: body.typeIntervention || 'maintenance',
      date: scheduledDate,
      heureDebut: startTime,
      heureFin: computeEndTime(startTime, durationHours),
      clientId: body.clientId || undefined,
      technicienId: body.technicienId || undefined,
      maintenanceContractId,
      isCoveredByContract
    })

    // Temps réel + audit
    try {
      const auth = await requireAuth(request).catch(() => null)
      await logAuditEvent({
        entityType: 'Intervention',
        entityId: String(created._id),
        action: 'created',
        newState: created.toObject ? created.toObject() : created,
        userId: (auth as any)?.userId,
        userRole: (auth as any)?.role,
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })
      emitInterventionUpdate(String(created._id), { id: String(created._id), status: 'pending' })
      if (body.clientId) {
        emitUserNotification(body.clientId, {
          type: 'info',
          title: 'Nouvelle intervention créée',
          message: created.title,
          data: { interventionId: String(created._id) }
        })
      }
    } catch (e) { console.error('[Intervention] Realtime/audit error:', e) }

    return NextResponse.json({
      success: true,
      intervention: created,
      ...(overageAlert && { warning: 'Plafond interventions du contrat atteint. Intervention hors contrat.' })
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur création intervention:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour une intervention (affectation + statut)
export async function PUT(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireInterventionAccess(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json()
    const { interventionId, technicianId, scheduledDate, scheduledTime, status } = body

    if (!interventionId) {
      return NextResponse.json(
        { error: 'ID intervention requis' },
        { status: 400 }
      )
    }

    const intervention = await Intervention.findById(interventionId)
    if (!intervention) {
      return NextResponse.json({ error: 'Intervention introuvable' }, { status: 404 })
    }

    const updatePayload: any = {}

    // Validation et assignation technicien
    if (technicianId !== undefined) {
      if (technicianId) {
        const tech = await Technician.findById(technicianId).lean() as any
        if (!tech) {
          return NextResponse.json({ error: 'Technicien introuvable' }, { status: 400 })
        }
        if (!tech.isActive) {
          return NextResponse.json({ error: 'Technicien inactif' }, { status: 400 })
        }
        if (!tech.isAvailable) {
          return NextResponse.json(
            { error: 'Technicien indisponible', code: 'TECH_UNAVAILABLE' },
            { status: 409 }
          )
        }
        // Vérification compétences requises
        const requiredSkills = (intervention.requiredSkills || []) as string[]
        const specialties = (tech.specialties || []) as string[]
        if (requiredSkills.length > 0) {
          const hasRequiredSkills = requiredSkills.every((skill: string) =>
            specialties.some((s: string) => s.toLowerCase() === skill.toLowerCase())
          )
          if (!hasRequiredSkills) {
            return NextResponse.json(
              {
                error: 'Compétences insuffisantes',
                code: 'SKILL_MISMATCH',
                requiredSkills,
                technicianSkills: specialties
              },
              { status: 409 }
            )
          }
        }
        updatePayload.assignedTechnician = technicianId
        updatePayload.technicienId = technicianId
        updatePayload.status = 'scheduled'
      } else {
        // Désassignation
        updatePayload.assignedTechnician = undefined
        updatePayload.technicienId = undefined
        updatePayload.status = 'pending'
      }
    }

    if (scheduledDate !== undefined) updatePayload.scheduledDate = scheduledDate
    if (scheduledTime !== undefined) updatePayload.scheduledTime = scheduledTime

    // Transition de statut explicite
    if (status && ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      updatePayload.status = status

      // Décrémentation compteur contrat lors du passage à completed
      if (status === 'completed' && intervention.isCoveredByContract && intervention.maintenanceContractId) {
        const contract = await MaintenanceContract.findById(intervention.maintenanceContractId)
        if (contract) {
          const used = (contract.coverage?.interventionsUsed || 0)
          const included = (contract.coverage?.interventionsIncluded || 0)
          if (included > 0 && used < included) {
            contract.coverage.interventionsUsed = used + 1
            await contract.save()
          }
        }
      }
    }

    const previousState = intervention.toObject ? intervention.toObject() : intervention
    await Intervention.updateOne({ _id: interventionId }, { $set: updatePayload })
    const updated = await Intervention.findById(interventionId).lean()

    // Temps réel + audit
    try {
      const auth = await requireAuth(request).catch(() => null)
      await logAuditEvent({
        entityType: 'Intervention',
        entityId: interventionId,
        action: 'updated',
        previousState,
        newState: updated as any,
        changedFields: Object.keys(updatePayload),
        userId: (auth as any)?.userId,
        userRole: (auth as any)?.role,
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: { statusChanged: !!status, technicianAssigned: !!technicianId }
      })
      const updatedAny = updated as any
      emitInterventionUpdate(interventionId, { id: interventionId, status: updatedAny?.status as string })
      if (updatedAny?.clientId) {
        emitUserNotification(String(updatedAny.clientId), {
          type: 'info',
          title: 'Intervention mise à jour',
          message: `${updatedAny.title} — ${status || 'modifiée'}`,
          data: { interventionId }
        })
      }
    } catch (e) { console.error('[Intervention] Realtime/audit error:', e) }

    return NextResponse.json({ success: true, intervention: updated })

  } catch (error) {
    console.error('Erreur mise à jour intervention:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
