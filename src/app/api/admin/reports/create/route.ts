import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import Technician from '@/lib/models/Technician'
import Client from '@/lib/models/Client'
import { requireAdminApi } from '@/lib/api-auth'

// POST /api/admin/reports/create
// Crée un rapport de maintenance en résolvant technicien/client par nom
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await connectMongoose()

    const body = await request.json()

    // ── Résolution technicien ──────────────────────────────────────────────
    const techName: string = body.technicianName || ''
    const techQuery = techName
      ? { name: { $regex: techName, $options: 'i' } }
      : {}
    const technician = techName
      ? (await Technician.findOne(techQuery).lean() as any)
      : null

    if (!technician) {
      return NextResponse.json(
        { error: `Technicien introuvable : "${techName}". Vérifiez le nom ou passez technicianId directement.` },
        { status: 404 }
      )
    }
    const technicianId = String(technician._id)

    // ── Résolution client (société) ────────────────────────────────────────
    const clientSearch: string = body.clientName || ''
    const clientDoc = clientSearch
      ? (await Client.findOne({
          $or: [
            { company: { $regex: clientSearch, $options: 'i' } },
            { name: { $regex: clientSearch, $options: 'i' } }
          ]
        }).lean() as any)
      : null

    const clientId: mongoose.Types.ObjectId = clientDoc
      ? new mongoose.Types.ObjectId(String(clientDoc._id))
      : new mongoose.Types.ObjectId()

    // ── Résolution projet (optionnel) ──────────────────────────────────────
    const projectId: mongoose.Types.ObjectId = body.projectId
      ? new mongoose.Types.ObjectId(String(body.projectId))
      : new mongoose.Types.ObjectId()

    // ── Auto-génération reportId ───────────────────────────────────────────
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const rand = crypto.randomUUID().replace(/-/g, '').substring(0, 4).toUpperCase()
    const reportId = `RPT-${date}-${rand}`

    // ── Création rapport ───────────────────────────────────────────────────
    const report = new MaintenanceReport({
      reportId,
      technicianId,
      clientId,
      projectId,
      interventionDate: body.interventionDate ? new Date(body.interventionDate) : new Date(),
      startTime:  body.startTime  || '09:00',
      endTime:    body.endTime    || '17:00',
      duration:   body.duration   || 480,
      site:       body.site,
      interventionType: body.interventionType || 'repair',
      templateId:      'admin-manual',
      templateVersion: '1.0',
      formData: {},
      initialObservations: body.initialObservations || '',
      problemDescription:  body.problemDescription  || '',
      problemSeverity:     body.problemSeverity     || 'high',
      tasksPerformed:      body.tasksPerformed       || [],
      results:             body.results             || '',
      recommendations:     body.recommendations     || [],
      issuesDetected:      body.issuesDetected      || [],
      materialsUsed:       body.materialsUsed       || [],
      followUpRecommendations: body.followUpRecommendations || [],
      nextActions:         body.nextActions         || [],
      billing: {
        needsQuote:    body.needsQuote    ?? false,
        quoteStatus:   'not_started',
        invoiceStatus: 'not_started',
        lastUpdatedAt: new Date()
      },
      clientAcknowledgement: { status: 'pending' },
      photos: { before: [], after: [] },
      signatures: {},
      status:           body.status           || 'published',
      priority:         body.priority         || 'high',
      publishedToClient: body.publishedToClient ?? true,
      publishedAt:      new Date(),
      version: 1,
      analytics: { timeToComplete: 0, revisionCount: 0 }
    })

    await report.save()

    // Mise à jour stats technicien
    await Technician.findByIdAndUpdate(technicianId, { $inc: { 'stats.totalReports': 1 } })

    const populated = await MaintenanceReport.findById(report._id)
      .populate('clientId', 'name company')
      .lean()

    return NextResponse.json({
      success: true,
      reportId,
      report: populated,
      resolved: {
        technician: { id: technicianId, name: technician.name },
        client: clientDoc
          ? { id: String(clientDoc._id), name: clientDoc.company || clientDoc.name }
          : { id: String(clientId), note: 'Client non trouvé — ID fictif généré' }
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Erreur création rapport admin:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}
