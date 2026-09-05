import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'
import Technician from '@/lib/models/Technician'
import { requireAuth } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

const ALLOWED = ['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN']

/**
 * GET /api/tech/interventions
 * Interventions du technicien connecté (ou d'un technicien donné pour l'admin).
 * Params: status, date (YYYY-MM-DD), from, to, technicianId (admin)
 */
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role, email } = await requireAuth(request) as any
    if (!ALLOWED.includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Résoudre le technicien : liaison via email (Technician n'a pas de userId)
    let techId: string | null = null
    if (role === 'TECHNICIAN') {
      const tech = await Technician.findOne({ email: String(email).toLowerCase() }).select('_id name').lean() as any
      if (!tech) return NextResponse.json({ error: 'Fiche technicien introuvable' }, { status: 404 })
      techId = String(tech._id)
    } else {
      techId = request.nextUrl.searchParams.get('technicianId')
    }

    const q: any = {}
    const and: any[] = []
    if (techId && mongoose.Types.ObjectId.isValid(techId)) {
      and.push({ $or: [{ technicienId: techId }, { assignedTechnician: techId }] })
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    if (status && status !== 'all') q.status = status

    // Filtre période : date exacte ou plage [from, to]
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (date) {
      and.push({ $or: [
        { scheduledDate: date },
        { date: { $gte: new Date(`${date}T00:00:00`), $lt: new Date(`${date}T23:59:59.999`) } },
      ] })
    } else if (from || to) {
      const range: any = {}
      if (from) range.$gte = new Date(`${from}T00:00:00`)
      if (to) range.$lte = new Date(`${to}T23:59:59.999`)
      q.date = range
    }
    if (and.length) q.$and = and

    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const items = await Intervention.find(q)
      .select('title description status priority type typeIntervention date scheduledDate scheduledTime heureDebut heureFin estimatedDuration client clientId photosAvant photosApres signatures observations activites tasks materialsUsed')
      .populate('clientId', 'name company address city phone email')
      .sort({ date: 1, heureDebut: 1 })
      .limit(limit)
      .lean() as any[]

    return NextResponse.json({
      interventions: items.map(i => ({
        id: String(i._id),
        title: i.title,
        description: i.description,
        status: i.status,
        priority: i.priority,
        type: i.typeIntervention || i.type,
        date: i.date,
        scheduledDate: i.scheduledDate,
        heureDebut: i.heureDebut || i.scheduledTime,
        heureFin: i.heureFin,
        duration: i.estimatedDuration,
        client: i.clientId ? {
          name: (i.clientId as any).name,
          company: (i.clientId as any).company,
          address: (i.clientId as any).address,
          city: (i.clientId as any).city,
          phone: (i.clientId as any).phone,
        } : (i.client ? { name: i.client } : null),
        report: {
          photosAvant: (i.photosAvant || []).length,
          photosApres: (i.photosApres || []).length,
          signedByClient: !!i.signatures?.client?.signature,
          hasObservations: !!i.observations,
        },
      })),
    })
  } catch (error) {
    console.error('[api/tech/interventions]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
