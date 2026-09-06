import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Technician from '@/lib/models/Technician'
import { requireAuth } from '@/lib/jwt'
import { requireInterventionAccess } from '@/lib/interventions-access'
import { emitInterventionUpdate, emitUserNotification } from '@/lib/socket-emit'
import { logAuditEvent } from '@/lib/audit'

function computeEndTime(start: string, durationHours: number) {
  const [h, m] = start.split(':').map((part) => parseInt(part, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return '10:00'
  const date = new Date()
  date.setHours(h)
  date.setMinutes(m)
  date.setSeconds(0)
  date.setMilliseconds(0)
  date.setHours(date.getHours() + Math.max(durationHours, 1))
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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
    const technicianId = searchParams.get('technicianId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)
    const query: any = {}
    if (date) query.scheduledDate = date
    if (status) {
      const statuses = status.split(',').filter(Boolean)
      query.status = statuses.length > 1 ? { $in: statuses } : statuses[0]
    }
    if (service && service !== 'all') query.service = service
    if (zone && zone !== 'all') query['client.zone'] = zone
    if (technicianId) query.technicienId = technicianId

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
    const auth = await requireAuth(request).catch(() => null)
    const access = await requireInterventionAccess(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json()

    // Validation des données
    if (!body.title || !body.service || (!body.client && !body.clientId)) {
      return NextResponse.json(
        { error: 'Données manquantes: title, service et client (id ou objet) requis' },
        { status: 400 }
      )
    }

    const scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : new Date()
    const startTime = body.scheduledTime || '09:00'
    const durationHours = Number(body.estimatedDuration) || 2

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
        maintenanceContractId = activeContract._id
        if (included === 0 || used < included) {
          isCoveredByContract = true
        } else {
          overageAlert = true
        }
      }
    }

    // Auto-affectation du technicien connecté si non précisé
    let technicienId = body.technicienId
    if (!technicienId && auth?.role === 'TECHNICIAN') {
      const tech = await Technician.findOne({ userId: auth.userId }).lean() as any
      if (tech?._id) technicienId = String(tech._id)
    }

    const scheduledDateString = scheduledDate.toISOString().split('T')[0]

    const created = await Intervention.create({
      title: body.title,
      description: body.description || '',
      client: body.client || undefined,
      service: body.service,
      priority: body.priority || 'medium',
      estimatedDuration: durationHours,
      requiredSkills: body.requiredSkills || [],
      status: technicienId ? 'scheduled' : 'pending',
      projectId: body.projectId || undefined,
      typeIntervention: body.typeIntervention || 'maintenance',
      date: scheduledDate,
      scheduledDate: scheduledDateString,
      scheduledTime: startTime,
      heureDebut: startTime,
      heureFin: computeEndTime(startTime, durationHours),
      clientId: body.clientId || undefined,
      technicienId: technicienId || undefined,
      assignedTechnician: technicienId || undefined,
      maintenanceContractId,
      isCoveredByContract
    })

    if (created.addHistoryEntry) {
      created.addHistoryEntry('created', auth?.userId || 'system', { status: created.status, technicianAssigned: !!technicienId })
      await created.save()
    }

    // Temps réel + audit
    try {
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
      emitInterventionUpdate(String(created._id), { id: String(created._id), status: created.status })
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
    const auth = await requireAuth(request).catch(() => null)
    const access = await requireInterventionAccess(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

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
        if (intervention.status === 'pending') {
          updatePayload.status = 'scheduled'
        }
        // S'assurer qu'une date/horaire soit renseignée lors de l'assignation
        if (!intervention.scheduledDate && !scheduledDate) {
          const fallbackDate = intervention.date || new Date()
          updatePayload.scheduledDate = fallbackDate.toISOString().split('T')[0]
        }
        if (!intervention.heureDebut && !scheduledTime) {
          updatePayload.scheduledTime = '09:00'
          updatePayload.heureDebut = '09:00'
        }
      } else {
        // Désassignation
        updatePayload.assignedTechnician = null
        updatePayload.technicienId = null
        updatePayload.status = 'pending'
      }
    }

    if (scheduledDate !== undefined) {
      updatePayload.scheduledDate = scheduledDate
      const parsed = new Date(scheduledDate)
      if (!Number.isNaN(parsed.getTime())) {
        updatePayload.date = parsed
      }
    }
    if (scheduledTime !== undefined) {
      updatePayload.scheduledTime = scheduledTime
      updatePayload.heureDebut = scheduledTime
      const durationHours = Number(intervention.estimatedDuration) || 2
      updatePayload.heureFin = computeEndTime(scheduledTime, durationHours)
    }

    // Transition de statut explicite
    let statusChanged = false
    if (status && ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      updatePayload.status = status
      statusChanged = true

      // Quand une intervention est marquée terminée, mettre à jour le contrat et l'historique
      if (status === 'completed' && intervention.maintenanceContractId) {
        const contract = await MaintenanceContract.findById(intervention.maintenanceContractId)
        if (contract) {
          const used = (contract.coverage?.interventionsUsed || 0)
          const included = (contract.coverage?.interventionsIncluded || 0)
          if (included === 0 || used < included) {
            contract.coverage.interventionsUsed = used + 1
          }
          contract.stats.totalInterventions = (contract.stats.totalInterventions || 0) + 1
          if (intervention.typeIntervention === 'maintenance' || intervention.typeIntervention === 'preventive') {
            contract.stats.preventiveInterventions = (contract.stats.preventiveInterventions || 0) + 1
          } else {
            contract.stats.curativeInterventions = (contract.stats.curativeInterventions || 0) + 1
          }
          await contract.save()
        }
      }
    }

    const previousState = intervention.toObject ? intervention.toObject() : intervention
    await Intervention.updateOne({ _id: interventionId }, { $set: updatePayload })
    const updated = await Intervention.findById(interventionId)

    if (updated?.addHistoryEntry) {
      updated.addHistoryEntry('updated', auth?.userId || 'system', {
        previousStatus: intervention.status,
        newStatus: updatePayload.status,
        statusChanged,
        technicianAssigned: !!technicianId
      })
      await updated.save()
    }

    // Temps réel + audit
    try {
      await logAuditEvent({
        entityType: 'Intervention',
        entityId: interventionId,
        action: 'updated',
        previousState,
        newState: updated ? (updated.toObject ? updated.toObject() : updated) : {},
        changedFields: Object.keys(updatePayload),
        userId: (auth as any)?.userId,
        userRole: (auth as any)?.role,
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: { statusChanged, technicianAssigned: !!technicianId }
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
