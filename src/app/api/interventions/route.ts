import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import jwt from 'jsonwebtoken'

function requireAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { ok: false, status: 401, error: 'Non authentifié' as const }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    const role = String(decoded.role || '').toUpperCase()
    const allowed = ['ADMIN','TECHNICIAN','PRODUCT_MANAGER'].includes(role)
    if (!allowed) return { ok: false, status: 403, error: 'Accès refusé' as const }
    return { ok: true }
  } catch {
    return { ok: false, status: 401, error: 'Token invalide' as const }
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
    const auth = requireAuth(request)
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
      technicienId: body.technicienId || undefined
    })

    return NextResponse.json({ success: true, intervention: created }, { status: 201 })

  } catch (error) {
    console.error('Erreur création intervention:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour une intervention (affectation)
export async function PUT(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    
    const body = await request.json()
    const { interventionId, technicianId, scheduledDate, scheduledTime } = body

    if (!interventionId) {
      return NextResponse.json(
        { error: 'ID intervention requis' },
        { status: 400 }
      )
    }

    await Intervention.updateOne({ _id: interventionId }, { $set: {
      assignedTechnician: technicianId || undefined,
      scheduledDate,
      scheduledTime,
      status: technicianId ? 'scheduled' : 'pending'
    } })
    const updated = await Intervention.findById(interventionId).lean()
    return NextResponse.json({ success: true, intervention: updated })

  } catch (error) {
    console.error('Erreur mise à jour intervention:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
