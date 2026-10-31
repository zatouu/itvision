import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import type {
  IMaintenanceReportIssue,
  IMaintenanceReportMaterial,
  IMaintenanceReportRecommendation,
  IMaintenanceReportBilling,
  IMaintenanceReportNextAction
} from '@/lib/models/MaintenanceReport'
import Technician from '@/lib/models/Technician'
import Project from '@/lib/models/Project'
import Intervention from '@/lib/models/Intervention'
import '@/lib/models/Client' // registration nécessaire pour .populate('clientId')
import { requireApiUser, authErrorResponse } from '@/lib/api-auth'
import { resolveTechnicianId, isAssignedTechnician } from '@/lib/interventions-access'
import { projectTechRole } from '@/lib/projects/team'
import { advanceIntervention } from '@/lib/interventions/lifecycle'
import { isOwnUploadUrl } from '@/lib/maintenance/report-rules'

async function verifyTechnicianToken(request: NextRequest) {
  // Clients exclus : ils lisent les rapports publiés via le portail entreprise
  const user = await requireApiUser(request, ['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'])
  return { ...user, technicianId: user.technicianId || (user.role === 'TECHNICIAN' ? user.userId : undefined) }
}

const ISSUE_SEVERITIES = new Set(['low', 'medium', 'high', 'critical'])
const INTERVENTION_TYPES = new Set(['maintenance', 'preventive', 'installation', 'repair', 'inspection', 'emergency'])

const isSignature = (s: unknown): s is string =>
  typeof s === 'string' && s.startsWith('data:image/png;base64,') && s.length < 600_000

/** Photos d'un rapport : uniquement nos propres uploads, 30 au plus par catégorie. */
function parsePhotos(input: unknown): Array<{ url: string; caption?: string; timestamp: Date; gps?: { lat: number; lng: number } }> {
  if (!Array.isArray(input)) return []
  return input
    .map((photo: any) => {
      const url = typeof photo === 'string' ? photo : photo?.url
      if (!isOwnUploadUrl(url)) return null
      const gps = photo?.gps && Number.isFinite(Number(photo.gps.lat)) ? { lat: Number(photo.gps.lat), lng: Number(photo.gps.lng) } : undefined
      return {
        url,
        caption: typeof photo === 'object' ? String(photo?.caption || '').slice(0, 200) || undefined : undefined,
        timestamp: (typeof photo === 'object' && photo?.timestamp && !isNaN(new Date(photo.timestamp).getTime())) ? new Date(photo.timestamp) : new Date(),
        gps,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .slice(0, 30)
}
const ISSUE_STATUSES = new Set(['identified', 'in_progress', 'resolved'])
const RECOMMENDATION_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent'])
const REPORT_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent'])
const RECOMMENDATION_STATUSES = new Set(['pending', 'quoted', 'approved', 'rejected', 'completed'])
const CLIENT_DECISION_STATUSES = new Set(['pending', 'approved', 'rejected'])
const CLIENT_ACK_STATUSES = new Set(['pending', 'acknowledged', 'contested'])
const BILLING_QUOTE_STATUSES = new Set(['not_started', 'draft', 'sent', 'approved', 'rejected'])
const BILLING_INVOICE_STATUSES = new Set(['not_started', 'draft', 'sent', 'paid', 'overdue'])
const NEXT_ACTION_STATUSES = new Set(['pending', 'scheduled', 'completed', 'cancelled'])

const toNumber = (value: any): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const toDate = (value: any): Date | undefined => {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const toNonEmptyString = (value: any): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const sanitizeStringArray = (input: any): string[] => {
  if (!Array.isArray(input)) return []
  return input
    .map((entry) => toNonEmptyString(entry))
    .filter((entry): entry is string => Boolean(entry))
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

function normalizeIssues(raw: unknown): IMaintenanceReportIssue[] {
  if (!Array.isArray(raw)) return []
  const mapped: (IMaintenanceReportIssue | null)[] = raw.map((item, index) => {
    if (!isRecord(item)) return null

    const componentValue = item.component
    const descriptionValue = item.description
    const component = toNonEmptyString(typeof componentValue === 'string' ? componentValue : '')
    const description = toNonEmptyString(typeof descriptionValue === 'string' ? descriptionValue : '')
    if (!component || !description) return null

    const reference = toNonEmptyString(typeof item.reference === 'string' ? item.reference : '')
      || `ISS-${Date.now()}-${index}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
    const severityCandidate = String(item.severity ?? '').toLowerCase()
    const severity = ISSUE_SEVERITIES.has(severityCandidate) ? (severityCandidate as IMaintenanceReportIssue['severity']) : 'medium'
    const statusCandidate = String(item.status ?? '').toLowerCase()
    const status = ISSUE_STATUSES.has(statusCandidate) ? (statusCandidate as IMaintenanceReportIssue['status']) : 'identified'

    const photos = Array.isArray(item.photos)
      ? item.photos
          .map((photo) => toNonEmptyString(typeof photo === 'string' ? photo : ''))
          .filter((photo): photo is string => Boolean(photo))
      : []

    return {
      reference,
      component,
      description,
      severity,
      status,
      location: toNonEmptyString(typeof item.location === 'string' ? item.location : ''),
      impact: toNonEmptyString(typeof item.impact === 'string' ? item.impact : ''),
      immediateAction: toNonEmptyString(typeof item.immediateAction === 'string' ? item.immediateAction : ''),
      photos,
      requiresQuote: Boolean(item.requiresQuote),
      recommendedSolution: toNonEmptyString(typeof item.recommendedSolution === 'string' ? item.recommendedSolution : ''),
      estimatedCost: toNumber(item.estimatedCost),
      estimatedDurationHours: toNumber(item.estimatedDurationHours)
    }
  })
  return mapped.filter((entry): entry is IMaintenanceReportIssue => entry !== null)
}

function normalizeMaterials(raw: unknown): IMaintenanceReportMaterial[] {
  if (!Array.isArray(raw)) return []
  const mapped: (IMaintenanceReportMaterial | null)[] = raw.map((item) => {
    if (!isRecord(item)) return null
    const name = toNonEmptyString(typeof item.name === 'string' ? item.name : '')
    if (!name) return null

    const quantity = toNumber(item.quantity) ?? 1
    const unitCost = toNumber(item.unitCost)
    const unitPrice = toNumber(item.unitPrice)

    return {
      name,
      sku: toNonEmptyString(typeof item.sku === 'string' ? item.sku : ''),
      category: toNonEmptyString(typeof item.category === 'string' ? item.category : ''),
      supplierReference: toNonEmptyString(typeof item.supplierReference === 'string' ? item.supplierReference : ''),
      quantity: quantity < 0 ? 0 : quantity,
      unitCost,
      unitPrice,
      totalCost: toNumber(item.totalCost) ?? (unitCost !== undefined ? unitCost * quantity : undefined),
      totalPrice: toNumber(item.totalPrice) ?? (unitPrice !== undefined ? unitPrice * quantity : undefined)
    }
  })
  return mapped.filter((entry): entry is IMaintenanceReportMaterial => entry !== null)
}

function normalizeRecommendations(raw: unknown): IMaintenanceReportRecommendation[] {
  if (!Array.isArray(raw)) return []
  const mapped = raw.map((item) => {
    if (!isRecord(item)) return null
    const title = toNonEmptyString(typeof item.title === 'string' ? item.title : '')
    if (!title) return null

    const priorityCandidate = String(item.priority ?? '').toLowerCase()
    const priority = RECOMMENDATION_PRIORITIES.has(priorityCandidate)
      ? (priorityCandidate as IMaintenanceReportRecommendation['priority'])
      : 'medium'

    const statusCandidate = String(item.status ?? '').toLowerCase()
    const status = RECOMMENDATION_STATUSES.has(statusCandidate)
      ? (statusCandidate as IMaintenanceReportRecommendation['status'])
      : 'pending'

    const requiresQuote = item.requiresQuote === undefined ? true : Boolean(item.requiresQuote)

    let clientDecision
    if (isRecord(item.clientDecision)) {
      const decisionStatusCandidate = String(item.clientDecision.status ?? '').toLowerCase()
      const decisionStatus = CLIENT_DECISION_STATUSES.has(decisionStatusCandidate)
        ? (decisionStatusCandidate as NonNullable<IMaintenanceReportRecommendation['clientDecision']>['status'])
        : 'pending'
      clientDecision = {
        status: decisionStatus,
        decidedAt: toDate(item.clientDecision.decidedAt),
        comments: toNonEmptyString(item.clientDecision.comments)
      }
    }

    return {
      title,
      description: toNonEmptyString(typeof item.description === 'string' ? item.description : ''),
      category: toNonEmptyString(typeof item.category === 'string' ? item.category : ''),
      priority,
      recommendedDate: toDate(item.recommendedDate),
      estimatedCost: toNumber(item.estimatedCost),
      estimatedDurationHours: toNumber(item.estimatedDurationHours),
      requiresQuote,
      quoteId: toNonEmptyString(typeof item.quoteId === 'string' ? item.quoteId : ''),
      status,
      clientDecision
    }
  })
  return mapped.filter((entry: any) => entry !== null && entry !== undefined) as IMaintenanceReportRecommendation[]
}

function normalizeNextActions(raw: unknown): IMaintenanceReportNextAction[] {
  if (!Array.isArray(raw)) return []
  const mapped = raw.map((item): any => {
    if (!isRecord(item)) return null
    const title = toNonEmptyString(typeof item.title === 'string' ? item.title : '')
    if (!title) return null

    const statusCandidate = String(item.status ?? '').toLowerCase()
    const status = NEXT_ACTION_STATUSES.has(statusCandidate)
      ? (statusCandidate as IMaintenanceReportNextAction['status'])
      : 'pending'

    return {
      title,
      scheduledDate: toDate(item.scheduledDate),
      assignedTo: toNonEmptyString(typeof item.assignedTo === 'string' ? item.assignedTo : ''),
      notes: toNonEmptyString(typeof item.notes === 'string' ? item.notes : ''),
      status
    }
  })
  return mapped.filter((entry: any) => entry !== null) as IMaintenanceReportNextAction[]
}

function normalizeBilling(
  raw: unknown,
  fallbackNeedsQuote: boolean,
  current?: IMaintenanceReportBilling
): IMaintenanceReportBilling {
  const record = isRecord(raw) ? raw : {}

  const needsQuote = typeof record.needsQuote === 'boolean'
    ? record.needsQuote
    : (current?.needsQuote ?? fallbackNeedsQuote)

  const quoteStatusCandidate = String(record.quoteStatus ?? current?.quoteStatus ?? '').toLowerCase()
  const quoteStatus = BILLING_QUOTE_STATUSES.has(quoteStatusCandidate)
    ? (quoteStatusCandidate as IMaintenanceReportBilling['quoteStatus'])
    : (current?.quoteStatus ?? 'not_started')

  const invoiceStatusCandidate = String(record.invoiceStatus ?? current?.invoiceStatus ?? '').toLowerCase()
  const invoiceStatus = BILLING_INVOICE_STATUSES.has(invoiceStatusCandidate)
    ? (invoiceStatusCandidate as IMaintenanceReportBilling['invoiceStatus'])
    : (current?.invoiceStatus ?? 'not_started')

  return {
    needsQuote,
    quoteStatus,
    quoteId: (record.quoteId ?? current?.quoteId) as any,
    invoiceId: (record.invoiceId ?? current?.invoiceId) as any,
    invoiceStatus,
    lastUpdatedAt: new Date()
  } as any
}

function normalizeClientAcknowledgement(raw: unknown) {
  if (!isRecord(raw)) return undefined
  const statusCandidate = String(raw.status ?? '').toLowerCase()
  const status = CLIENT_ACK_STATUSES.has(statusCandidate) ? statusCandidate : 'pending'
  return {
    status,
    name: toNonEmptyString(typeof raw.name === 'string' ? raw.name : ''),
    signedAt: toDate(raw.signedAt),
    comments: toNonEmptyString(typeof raw.comments === 'string' ? raw.comments : '')
  }
}

function extractStructuredFields(
  raw: unknown,
  options: { includeEmpty?: boolean; current?: { followUpRecommendations?: IMaintenanceReportRecommendation[]; billing?: IMaintenanceReportBilling } } = {}
) {
  const structured: Record<string, unknown> = {}
  const includeEmpty = options.includeEmpty ?? false

  const record = isRecord(raw) ? raw : {}

  const issuesProvided = includeEmpty || Object.prototype.hasOwnProperty.call(record, 'issuesDetected')
  const materialsProvided = includeEmpty || Object.prototype.hasOwnProperty.call(record, 'materialsUsed')
  const recommendationsProvided = includeEmpty || Object.prototype.hasOwnProperty.call(record, 'followUpRecommendations')
  const nextActionsProvided = includeEmpty || Object.prototype.hasOwnProperty.call(record, 'nextActions')
  const clientAckProvided = includeEmpty || Object.prototype.hasOwnProperty.call(record, 'clientAcknowledgement')
  const billingProvided = includeEmpty || Object.prototype.hasOwnProperty.call(record, 'billing')

  if (issuesProvided) {
    structured.issuesDetected = normalizeIssues(record.issuesDetected)
  }

  if (materialsProvided) {
    structured.materialsUsed = normalizeMaterials(record.materialsUsed)
  }

  if (recommendationsProvided) {
    structured.followUpRecommendations = normalizeRecommendations(record.followUpRecommendations)
  }

  if (nextActionsProvided) {
    structured.nextActions = normalizeNextActions(record.nextActions)
  }

  const followUps = (structured.followUpRecommendations as IMaintenanceReportRecommendation[] | undefined)
    ?? options.current?.followUpRecommendations
    ?? []
  const inferredNeedsQuote = followUps.some((entry) => entry.requiresQuote && entry.status !== 'completed')

  if (billingProvided || inferredNeedsQuote) {
    structured.billing = normalizeBilling(record.billing, inferredNeedsQuote, options.current?.billing)
  }

  if (clientAckProvided) {
    structured.clientAcknowledgement = normalizeClientAcknowledgement(record.clientAcknowledgement)
  }

  return structured
}

// GET - Récupérer les rapports (filtres par technicien)
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    
    const tokenData = await verifyTechnicianToken(request)
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')
    
    // Construction filtre - résoudre le vrai Technician._id
    const filter: Record<string, unknown> = {}
    if (tokenData.role === 'TECHNICIAN') {
      let resolvedTechId = tokenData.technicianId || tokenData.userId
      // Essayer de trouver le Technician par _id, sinon par email
      const tech = await Technician.findById(resolvedTechId).select('_id').lean().catch(() => null) as any
        || (tokenData.email ? await Technician.findOne({ email: String(tokenData.email).toLowerCase() }).select('_id').lean() as any : null)
      if (tech && tech._id) resolvedTechId = String(tech._id)
      filter.technicianId = resolvedTechId
    }
    
    if (status && status !== 'all') {
      filter.status = status
    }
    
    if (clientId) {
      filter.clientId = clientId
    }
    
    // Récupération rapports
    const reports = await MaintenanceReport.find(filter)
      .populate('clientId', 'name company')
      .populate('projectId', 'name')
      .sort({ interventionDate: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
    
    const totalCount = await MaintenanceReport.countDocuments(filter)
    
    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        total: totalCount,
        page: Math.floor(skip / limit) + 1,
        limit,
        hasMore: skip + limit < totalCount
      }
    })

  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur récupération rapports:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer nouveau rapport
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()

    const tokenData = await verifyTechnicianToken(request)
    const reportData = await request.json()
    const structuredFields = extractStructuredFields(reportData, { includeEmpty: true })

    if (!reportData.interventionDate || !reportData.site) {
      return NextResponse.json(
        { error: 'Champs requis manquants: interventionDate et site' },
        { status: 400 }
      )
    }

    // Résoudre le vrai technicien : un technicien rédige toujours en son nom
    let technicianId = reportData.technicianId || tokenData.technicianId
    let technician = null
    if (tokenData.role === 'TECHNICIAN') {
      const ownId = await resolveTechnicianId(tokenData.email)
      technician = ownId ? await Technician.findById(ownId) : null
    } else if (technicianId) {
      technician = await Technician.findById(technicianId).catch(() => null)
    }
    if (!technician || !technician.isActive) {
      return NextResponse.json(
        { error: 'Technicien non autorisé' },
        { status: 403 }
      )
    }
    technicianId = String(technician._id)

    // Résoudre client/projet/site via l'intervention si fournie, sinon via le projectId
    const interventionId: string | undefined = reportData.interventionId
    let clientId: string | undefined = reportData.clientId
    let projectId: string | undefined = reportData.projectId
    let interventionDate = new Date(reportData.interventionDate)
    let site = reportData.site
    let interventionType = INTERVENTION_TYPES.has(String(reportData.interventionType)) ? reportData.interventionType : 'maintenance'

    if (interventionId) {
      const intervention = await Intervention.findById(interventionId).lean() as any
      if (!intervention) {
        return NextResponse.json({ error: 'Intervention introuvable' }, { status: 404 })
      }
      if (tokenData.role === 'TECHNICIAN' && !isAssignedTechnician(intervention, technicianId)) {
        return NextResponse.json({ error: 'Intervention non assignée à ce technicien' }, { status: 403 })
      }
      if (intervention.status === 'cancelled') {
        return NextResponse.json({ error: 'Intervention annulée' }, { status: 409 })
      }
      clientId = intervention.clientId?.toString?.() || clientId
      projectId = intervention.projectId?.toString?.() || projectId
      interventionDate = intervention.date || interventionDate
      site = intervention.site || site
      interventionType = intervention.typeIntervention || interventionType
      // On hérite du technicien assigné si un admin rédige sans le préciser
      if (tokenData.role !== 'TECHNICIAN' && !reportData.technicianId && intervention.technicienId) {
        technicianId = intervention.technicienId.toString()
        technician = await Technician.findById(technicianId) || technician
      }
    }

    // Si projectId fourni sans clientId, on tente de récupérer le client du projet
    if (!clientId && projectId) {
      const project = await Project.findById(projectId).select('clientId').lean() as any
      if (project?.clientId) {
        clientId = project.clientId.toString()
      }
    }

    // Client sans projet précisé : en priorité le projet en cours dont le technicien est dans l'équipe,
    // sinon le projet en cours le plus récent (puis le plus récent tout court) — jamais un projet arbitraire
    if (clientId && !projectId) {
      const projects = await Project.find({ clientId: new mongoose.Types.ObjectId(clientId) })
        .select('_id status leadTechnicianId technicianIds')
        .sort({ updatedAt: -1 })
        .limit(30)
        .lean() as any[]
      const active = projects.filter(p => !['completed', 'maintenance', 'cancelled'].includes(String(p.status)))
      const mine = active.filter(p => projectTechRole(p, technicianId))
      const pick = mine[0] || active[0] || projects[0]
      if (pick) projectId = String(pick._id)
    }

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client introuvable pour ce rapport : renseignez le client de l’intervention.' },
        { status: 400 }
      )
    }

    // Heure de départ inconnue à la création : durée nulle, signalée à la soumission
    const startTime = String(reportData.startTime || '').slice(0, 5) || new Date().toTimeString().slice(0, 5)
    const endTime = String(reportData.endTime || '').slice(0, 5) || startTime
    const duration = computeDurationMinutes(startTime, endTime)

    const sanitizedTasks = sanitizeStringArray(reportData.tasksPerformed)
    const sanitizedRecommendations = sanitizeStringArray(reportData.recommendations)
    const initialObservations = toNonEmptyString(reportData.initialObservations) || 'Observations non renseignées'
    const results = toNonEmptyString(reportData.results) || 'N/A'
    const problemSeverityCandidate = String(reportData.problemSeverity || '').toLowerCase()
    const problemSeverity = ISSUE_SEVERITIES.has(problemSeverityCandidate)
      ? problemSeverityCandidate
      : 'medium'
    const priorityCandidate = String(reportData.priority || '').toLowerCase()
    const priority = REPORT_PRIORITIES.has(priorityCandidate)
      ? priorityCandidate
      : 'medium'

    const {
      issuesDetected,
      materialsUsed,
      followUpRecommendations,
      nextActions,
      billing,
      clientAcknowledgement
    } = structuredFields as {
      issuesDetected: IMaintenanceReportIssue[]
      materialsUsed: IMaintenanceReportMaterial[]
      followUpRecommendations: IMaintenanceReportRecommendation[]
      nextActions: IMaintenanceReportNextAction[]
      billing: IMaintenanceReportBilling
      clientAcknowledgement?: {
        status: string
        name?: string
        signedAt?: Date
        comments?: string
      }
    }

    // Support photos en format nested {before:[], after:[]} ou flat photosBefore/photosAfter
    const photos = {
      before: parsePhotos(reportData.photos?.before || reportData.photosBefore),
      after: parsePhotos(reportData.photos?.after || reportData.photosAfter)
    }

    // Création du rapport avec valeurs par défaut compatibles schéma
    const newReport = new MaintenanceReport({
      technicianId,
      clientId: new mongoose.Types.ObjectId(clientId),
      projectId: projectId ? new mongoose.Types.ObjectId(projectId) : undefined,
      interventionId: interventionId ? new mongoose.Types.ObjectId(interventionId) : undefined,
      interventionDate,
      startTime,
      endTime,
      duration,
      site,
      interventionType,
      templateId: reportData.templateId || 'generic',
      templateVersion: reportData.templateVersion || '1.0',
      formData: reportData.formData || {},
      initialObservations,
      problemDescription: reportData.problemDescription || '',
      problemSeverity,
      tasksPerformed: sanitizedTasks,
      results,
      recommendations: sanitizedRecommendations,
      issuesDetected,
      materialsUsed,
      followUpRecommendations,
      nextActions,
      billing,
      photos,
      signatures: {
        technician: isSignature(reportData.technicianSignature)
          ? { signature: reportData.technicianSignature, name: String(reportData.technician || technician.name || 'Technicien').slice(0, 120), timestamp: new Date() }
          : undefined,
        client: isSignature(reportData.clientSignature)
          ? { signature: reportData.clientSignature, name: String(reportData.clientSignatoryName || '').slice(0, 120), title: String(reportData.clientTitle || '').slice(0, 120), timestamp: new Date() }
          : undefined,
      },
      gpsLocation: reportData.gpsLocation,
      status: 'draft',
      priority,
      version: 1,
      analytics: {
        timeToComplete: 0,
        revisionCount: 0
      }
    })

    newReport.calculateDuration()

    // Ajout entrée historique
    newReport.addHistoryEntry('created', technicianId, {
      initialStatus: newReport.status,
      followUpCount: followUpRecommendations.length,
      issuesDetected: issuesDetected.length
    })

    await newReport.save()

    // Mise à jour stats technicien
    technician.stats.totalReports += 1
    await technician.save()

    // Rapport commencé = intervention démarrée (jamais de retour en arrière si elle est déjà terminée)
    if (interventionId) {
      await advanceIntervention(interventionId, 'in_progress', tokenData.userId)
        .catch(e => console.error('[MaintenanceReport] Intervention liée:', e))
    }

    // Population pour réponse
    const populatedReport = await MaintenanceReport.findById(newReport._id)
      .populate('clientId', 'name company')
      .populate('projectId', 'name')
      .lean()

    return NextResponse.json({
      success: true,
      report: populatedReport,
      message: 'Rapport créé avec succès'
    }, { status: 201 })

  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur création rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du rapport' },
      { status: 500 }
    )
  }
}

function computeDurationMinutes(startTime: string, endTime: string): number | undefined {
  const parse = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    return h * 60 + m
  }
  const start = parse(startTime)
  const end = parse(endTime)
  if (start === null || end === null) return undefined
  let diff = end - start
  if (diff < 0) diff += 24 * 60
  return diff
}

// PUT - Mettre à jour rapport
export async function PUT(request: NextRequest) {
  try {
    await connectMongoose()
    
    const tokenData = await verifyTechnicianToken(request)
      const updateData = await request.json()
    const reportId = updateData.reportId
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'ID du rapport requis' },
        { status: 400 }
      )
    }

    // Résoudre le vrai Technician._id
    let technicianId = tokenData.technicianId || tokenData.userId
    const techRecord = await Technician.findById(technicianId).select('_id').lean().catch(() => null) as any
      || (tokenData.email ? await Technician.findOne({ email: String(tokenData.email).toLowerCase() }).select('_id').lean() as any : null)
    if (techRecord && techRecord._id) technicianId = String(techRecord._id)
    
    // Vérification propriété et droits
      const existingReport = await MaintenanceReport.findOne({
        _id: reportId,
        technicianId
      })
      
    if (!existingReport) {
      return NextResponse.json(
        { error: 'Rapport non trouvé ou accès non autorisé' },
        { status: 404 }
      )
    }

    // Seuls un brouillon ou un rapport à corriger se modifient (un rapport soumis attend la relecture)
    if (!['draft', 'rejected'].includes(existingReport.status)) {
      return NextResponse.json(
        { error: 'Rapport non modifiable dans cet état' },
        { status: 403 }
      )
    }

    const structuredUpdates = extractStructuredFields(updateData, {
      current: {
        followUpRecommendations: existingReport.followUpRecommendations,
        billing: existingReport.billing
      }
    })
    // L'accusé de réception appartient au client, jamais au technicien
    delete (structuredUpdates as Record<string, unknown>).clientAcknowledgement

    // Liste blanche : statut, validation, publication, technicien et client ne se modifient pas ici
    const $set: Record<string, unknown> = {}
    const $unset: Record<string, 1> = {}
    const has = (k: string) => Object.prototype.hasOwnProperty.call(updateData, k)
    if (has('site')) $set.site = toNonEmptyString(updateData.site) || existingReport.site
    if (has('interventionDate')) {
      const d = toDate(updateData.interventionDate)
      if (d) $set.interventionDate = d
    }
    if (has('startTime') && String(updateData.startTime || '').trim()) $set.startTime = String(updateData.startTime).slice(0, 5)
    const start = ($set.startTime as string | undefined) ?? existingReport.startTime
    // Champ requis par le schéma : départ inconnu = durée nulle, signalée à la soumission
    if (has('endTime')) $set.endTime = String(updateData.endTime || '').slice(0, 5) || start
    const end = ($set.endTime as string | undefined) ?? existingReport.endTime
    if (has('startTime') || has('endTime')) {
      const minutes = computeDurationMinutes(start, end)
      if (typeof minutes === 'number') $set.duration = minutes
    }
    if (has('interventionType') && !existingReport.interventionId && INTERVENTION_TYPES.has(String(updateData.interventionType))) {
      $set.interventionType = updateData.interventionType
    }
    if (has('initialObservations')) $set.initialObservations = toNonEmptyString(updateData.initialObservations) || existingReport.initialObservations
    if (has('problemDescription')) $set.problemDescription = String(updateData.problemDescription || '').slice(0, 5000)
    if (has('results')) $set.results = toNonEmptyString(updateData.results) || existingReport.results
    if (has('tasksPerformed')) $set.tasksPerformed = sanitizeStringArray(updateData.tasksPerformed)
    if (has('recommendations')) $set.recommendations = sanitizeStringArray(updateData.recommendations)
    if (has('problemSeverity')) {
      const candidate = String(updateData.problemSeverity || '').toLowerCase()
      $set.problemSeverity = ISSUE_SEVERITIES.has(candidate) ? candidate : existingReport.problemSeverity
    }
    if (has('priority')) {
      const candidate = String(updateData.priority || '').toLowerCase()
      $set.priority = REPORT_PRIORITIES.has(candidate) ? candidate : existingReport.priority
    }
    if (has('gpsLocation') && updateData.gpsLocation && Number.isFinite(Number(updateData.gpsLocation.lat))) {
      $set.gpsLocation = { lat: Number(updateData.gpsLocation.lat), lng: Number(updateData.gpsLocation.lng), accuracy: Number(updateData.gpsLocation.accuracy) || 0, timestamp: new Date() }
    }
    // Photos : la liste envoyée remplace la précédente (le formulaire renvoie toujours la liste complète)
    if (has('photosBefore')) $set['photos.before'] = parsePhotos(updateData.photosBefore)
    if (has('photosAfter')) $set['photos.after'] = parsePhotos(updateData.photosAfter)
    if (has('technicianSignature') && updateData.technicianSignature !== existingReport.signatures?.technician?.signature) {
      if (isSignature(updateData.technicianSignature)) {
        $set['signatures.technician'] = { signature: updateData.technicianSignature, name: String(updateData.technician || 'Technicien').slice(0, 120), timestamp: new Date() }
      } else $unset['signatures.technician'] = 1
    }
    if (has('clientSignature') && updateData.clientSignature !== existingReport.signatures?.client?.signature) {
      if (isSignature(updateData.clientSignature)) {
        $set['signatures.client'] = { signature: updateData.clientSignature, name: String(updateData.clientSignatoryName || '').slice(0, 120), title: String(updateData.clientTitle || '').slice(0, 120), timestamp: new Date() }
      } else $unset['signatures.client'] = 1
    }
    $set.status = 'draft'

    // Mise à jour
    const updatedReport = await MaintenanceReport.findByIdAndUpdate(
      reportId,
      {
        $set: { ...$set, ...structuredUpdates },
        ...(Object.keys($unset).length ? { $unset } : {}),
        $inc: { version: 1, 'analytics.revisionCount': 1 }
      },
      { new: true, runValidators: true }
    ).populate('clientId', 'name company')
     .populate('projectId', 'name')
    
    // Ajout historique
    updatedReport!.addHistoryEntry('updated', technicianId, {
      previousStatus: existingReport.status,
      newStatus: 'draft',
      fieldsChanged: Object.keys($set)
    })
    
    await updatedReport!.save()
    
    return NextResponse.json({
      success: true,
      report: updatedReport,
      message: 'Rapport mis à jour avec succès'
    })

  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur mise à jour rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}