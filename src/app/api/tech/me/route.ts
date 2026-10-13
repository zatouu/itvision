import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import Technician from '@/lib/models/Technician'
import { requireApiUser, authErrorResponse } from '@/lib/api-auth'
import { resolveTechnicianId } from '@/lib/interventions-access'

export const dynamic = 'force-dynamic'

const DAY = 24 * 60 * 60 * 1000

function dakarDay(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * DAY)
  return d.toISOString().slice(0, 10)
}

async function currentTechnician(request: NextRequest) {
  const user = await requireApiUser(request, ['TECHNICIAN'])
  const techId = await resolveTechnicianId(user.email)
  return { user, techId }
}

/**
 * GET /api/tech/me — tableau de bord du technicien connecté :
 * fiche, disponibilité, compteurs du jour, rapports à reprendre, satisfaction client.
 */
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { user, techId } = await currentTechnician(request)
    if (!techId) return NextResponse.json({ error: 'Fiche technicien introuvable' }, { status: 404 })

    const tid = new mongoose.Types.ObjectId(techId)
    const mine = { $or: [{ technicienId: tid }, { assignedTechnician: tid }] }
    const today = dakarDay()
    const in7 = dakarDay(7)
    const since30 = new Date(Date.now() - 30 * DAY)

    const [tech, todayCount, upcomingCount, inProgress, toClose, reportCounts, rejected, ratings, recentFeedback] = await Promise.all([
      Technician.findById(tid).select('name email phone specialties isAvailable profilePhoto stats preferences.workingHours').lean() as any,
      Intervention.countDocuments({ ...mine, status: { $in: ['scheduled', 'in_progress'] }, scheduledDate: today }),
      Intervention.countDocuments({ ...mine, status: 'scheduled', scheduledDate: { $gt: today, $lte: in7 } }),
      Intervention.countDocuments({ ...mine, status: 'in_progress' }),
      // Terminées récemment sans compte rendu ni bon signé : à compléter
      Intervention.countDocuments({
        ...mine,
        status: 'completed',
        date: { $gte: since30 },
        'photosApres.0': { $exists: false },
        observations: { $in: [null, ''] },
      }),
      MaintenanceReport.aggregate([
        { $match: { technicianId: tid } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
      MaintenanceReport.find({ technicianId: tid, status: 'rejected' })
        .select('reportId site interventionDate validation.comments validation.validatedAt')
        .sort({ 'validation.validatedAt': -1 }).limit(5).lean() as any,
      Intervention.aggregate([
        { $match: { ...mine, 'clientFeedback.rating': { $gte: 1 } } },
        { $group: { _id: null, avg: { $avg: '$clientFeedback.rating' }, n: { $sum: 1 } } },
      ]),
      Intervention.find({ ...mine, 'clientFeedback.rating': { $gte: 1 } })
        .select('title clientFeedback.rating clientFeedback.comment clientFeedback.submittedAt')
        .sort({ 'clientFeedback.submittedAt': -1 }).limit(5).lean() as any,
    ])

    const byStatus = Object.fromEntries((reportCounts as any[]).map(r => [r._id, r.n]))

    return NextResponse.json({
      technician: {
        id: techId,
        name: tech?.name || user.username || 'Technicien',
        email: tech?.email || user.email,
        phone: tech?.phone || '',
        specialties: tech?.specialties || [],
        isAvailable: tech?.isAvailable !== false,
        profilePhoto: tech?.profilePhoto || null,
        workingHours: tech?.preferences?.workingHours || null,
      },
      counts: {
        today: todayCount,
        upcoming: upcomingCount,
        inProgress,
        toClose,
        drafts: byStatus.draft || 0,
        rejected: byStatus.rejected || 0,
        pendingValidation: byStatus.pending_validation || 0,
        published: (byStatus.published || 0) + (byStatus.validated || 0),
      },
      rejectedReports: (rejected as any[]).map(r => ({
        id: String(r._id),
        reportId: r.reportId,
        site: r.site,
        date: r.interventionDate,
        comments: r.validation?.comments || '',
      })),
      rating: {
        average: ratings[0]?.avg ? Math.round(ratings[0].avg * 10) / 10 : null,
        count: ratings[0]?.n || 0,
        recent: (recentFeedback as any[]).map(i => ({
          title: i.title,
          rating: i.clientFeedback?.rating,
          comment: i.clientFeedback?.comment || '',
          date: i.clientFeedback?.submittedAt,
        })),
      },
    })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('[api/tech/me]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** PATCH /api/tech/me — disponibilité du technicien (prise en compte par le planning). */
export async function PATCH(request: NextRequest) {
  try {
    await connectMongoose()
    const { techId } = await currentTechnician(request)
    if (!techId) return NextResponse.json({ error: 'Fiche technicien introuvable' }, { status: 404 })
    const body = await request.json().catch(() => ({}))
    if (typeof body.isAvailable !== 'boolean') {
      return NextResponse.json({ error: 'isAvailable attendu' }, { status: 400 })
    }
    await Technician.updateOne({ _id: techId }, { $set: { isAvailable: body.isAvailable } })
    return NextResponse.json({ success: true, isAvailable: body.isAvailable })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('[api/tech/me PATCH]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
