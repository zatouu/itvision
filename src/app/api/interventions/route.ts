import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Technician from '@/lib/models/Technician'
import { requireAuth } from '@/lib/jwt'
import { requireInterventionAccess, resolveTechnicianId, isAssignedTechnician, TECHNICIAN_TRANSITIONS } from '@/lib/interventions-access'
import { emitInterventionUpdate, emitUserNotification } from '@/lib/socket-emit'
import { notifyInterventionChange } from '@/lib/portal/intervention-notify'
import { notifyTechnicianOfChange } from '@/lib/tech/notify-technician'
import { countCompletionOnContract } from '@/lib/interventions/lifecycle'
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
    const access = await requireInterventionAccess(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

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
    if (access.role === 'TECHNICIAN') {
      const ownTechId = await resolveTechnicianId(access.email)
      if (!ownTechId) return NextResponse.json({ success: true, interventions: [], total: 0 })
      query.$or = [{ technicienId: ownTechId }, { assignedTechnician: ownTechId }]
    } else if (technicianId) {
      query.technicienId = technicianId
    }

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

    // Un technicien ne crée que pour lui-même
    let technicienId = body.technicienId
    if (access.role === 'TECHNICIAN') {
      technicienId = await resolveTechnicianId(access.email) || undefined
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
      if (technicienId && access.role !== 'TECHNICIAN') {
        void notifyTechnicianOfChange(null, created.toObject ? created.toObject() : created)
      }
      if (body.clientId) {
        void notifyInterventionChange(null, created.toObject ? created.toObject() : created)
          .catch(e => console.error('[Intervention] notification:', e))
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

    // Technicien : uniquement ses interventions, uniquement démarrer / terminer
    if (access.role === 'TECHNICIAN') {
      const ownTechId = await resolveTechnicianId(access.email)
      if (!isAssignedTechnician(intervention, ownTechId)) {
        return NextResponse.json({ error: 'Intervention non assignée à ce technicien' }, { status: 403 })
      }
      if (technicianId !== undefined || scheduledDate !== undefined || scheduledTime !== undefined) {
        return NextResponse.json({ error: 'Affectation et horaires sont gérés par le planning' }, { status: 403 })
      }
      if (!status || !(TECHNICIAN_TRANSITIONS[intervention.status] || []).includes(status)) {
        return NextResponse.json({ error: 'Changement de statut non autorisé', code: 'INVALID_TRANSITION' }, { status: 409 })
      }
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

    // Champs éditables par l'admin (le technicien est déjà restreint plus haut)
    if (access.role !== 'TECHNICIAN') {
      if (body.title !== undefined) updatePayload.title = String(body.title).slice(0, 200)
      if (body.description !== undefined) updatePayload.description = String(body.description).slice(0, 5000)
      if (body.service !== undefined) updatePayload.service = String(body.service).slice(0, 80)
      if (body.site !== undefined) updatePayload.site = String(body.site).slice(0, 300)
      if (body.typeIntervention !== undefined && ['maintenance', 'preventive', 'installation', 'repair', 'inspection', 'emergency'].includes(body.typeIntervention)) {
        updatePayload.typeIntervention = body.typeIntervention
      }
      if (body.priority !== undefined && ['low', 'medium', 'high', 'critical', 'urgent'].includes(body.priority)) {
        updatePayload.priority = body.priority
      }
      if (body.estimatedDuration !== undefined && Number.isFinite(Number(body.estimatedDuration)) && Number(body.estimatedDuration) > 0) {
        updatePayload.estimatedDuration = Number(body.estimatedDuration)
      }
      if (Array.isArray(body.requiredSkills)) updatePayload.requiredSkills = body.requiredSkills.map((s: any) => String(s).slice(0, 60)).slice(0, 20)
      if (body.client && typeof body.client === 'object') {
        updatePayload.client = {
          name: String(body.client.name || intervention.client?.name || '').slice(0, 160),
          address: String(body.client.address || intervention.client?.address || '').slice(0, 300),
          phone: String(body.client.phone || intervention.client?.phone || '').slice(0, 40),
          zone: String(body.client.zone || intervention.client?.zone || '').slice(0, 80),
        }
      }
      if (body.clientId !== undefined && (body.clientId === null || mongoose.isValidObjectId(body.clientId))) {
        updatePayload.clientId = body.clientId || undefined
      }
    }

    // Transition de statut explicite
    let statusChanged = false
    if (status && ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      updatePayload.status = status
      statusChanged = status !== intervention.status
    }

    // Pointage : position du technicien à son arrivée sur site
    // Action faite hors ligne puis envoyée au retour du réseau : heure réelle (72 h au plus, jamais dans le futur)
    const occurredMs = access.role === 'TECHNICIAN' && body.occurredAt ? new Date(body.occurredAt).getTime() : NaN
    const occurredAt = Number.isFinite(occurredMs) && occurredMs <= Date.now() + 5 * 60_000 && occurredMs >= Date.now() - 72 * 3_600_000
      ? new Date(Math.min(occurredMs, Date.now()))
      : null
    const lat = Number(body.gps?.lat), lng = Number(body.gps?.lng)
    if (status === 'in_progress' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      updatePayload.gpsLocation = { lat, lng, timestamp: occurredAt || new Date() }
    }

    const previousState = intervention.toObject ? intervention.toObject() : intervention
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 })
    }
    // Mise à jour conditionnelle : un double clic ou deux écrans simultanés ne rejouent pas la transition
    const writeResult = await Intervention.updateOne(
      { _id: interventionId, status: intervention.status },
      { $set: updatePayload }
    )
    if (writeResult.matchedCount === 0) {
      return NextResponse.json({ error: 'Intervention modifiée entre-temps, rechargez la fiche', code: 'CONFLICT' }, { status: 409 })
    }

    // Contrat : une intervention n'est décomptée qu'au passage effectif à « terminée »
    if (statusChanged && status === 'completed') {
      await countCompletionOnContract(intervention)
    }

    const updated = await Intervention.findById(interventionId)

    if (updated?.addHistoryEntry) {
      updated.addHistoryEntry('updated', auth?.userId || 'system', {
        previousStatus: intervention.status,
        newStatus: updatePayload.status,
        statusChanged,
        technicianAssigned: !!technicianId,
        ...(occurredAt && statusChanged ? { occurredAt } : {}),
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
      if (updatedAny) {
        void notifyInterventionChange(previousState as any, updatedAny.toObject ? updatedAny.toObject() : updatedAny)
          .catch(e => console.error('[Intervention] notification:', e))
        if (access.role !== 'TECHNICIAN') {
          void notifyTechnicianOfChange(previousState as any, updatedAny.toObject ? updatedAny.toObject() : updatedAny)
        }
      }
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
