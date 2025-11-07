import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
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

async function verifyTechnicianToken(request: NextRequest) {
  // Supporte 'auth-token' (standard) et 'tech-auth-token' (legacy)
  const token = request.cookies.get('auth-token')?.value || 
                request.cookies.get('tech-auth-token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Token manquant')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  const role = String(decoded.role || '').toUpperCase()
  const technicianId = decoded.technicianId || (role === 'TECHNICIAN' ? decoded.userId : undefined)
  return { ...decoded, role, technicianId }
}

const ISSUE_SEVERITIES = new Set(['low', 'medium', 'high', 'critical'])
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
  return raw.map((item, index) => {
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
  }).filter((entry): entry is IMaintenanceReportIssue => Boolean(entry))
}

function normalizeMaterials(raw: unknown): IMaintenanceReportMaterial[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
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
  }).filter((entry): entry is IMaintenanceReportMaterial => Boolean(entry))
}

function normalizeRecommendations(raw: unknown): IMaintenanceReportRecommendation[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
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
  }).filter((entry): entry is IMaintenanceReportRecommendation => Boolean(entry))
}

function normalizeNextActions(raw: unknown): IMaintenanceReportNextAction[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
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
  }).filter((entry): entry is IMaintenanceReportNextAction => Boolean(entry))
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
    quoteId: (record.quoteId ?? current?.quoteId) as mongoose.Types.ObjectId | string | undefined,
    invoiceId: (record.invoiceId ?? current?.invoiceId) as mongoose.Types.ObjectId | string | undefined,
    invoiceStatus,
    lastUpdatedAt: new Date()
  }
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
    
    const { technicianId, role, userId } = await verifyTechnicianToken(request)
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')
    
    // Construction filtre
    const filter: Record<string, unknown> = {}
    if (role === 'TECHNICIAN') {
      filter.technicianId = technicianId || userId
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
    console.error('Erreur récupération rapports:', error)
    return NextResponse.json(
      { error: 'Accès non autorisé' },
      { status: 401 }
    )
  }
}

// POST - Créer nouveau rapport
export async function POST(request: NextRequest) {
  try {
      await connectMongoose()

      const { technicianId } = await verifyTechnicianToken(request)
      const reportData = await request.json()
      const structuredFields = extractStructuredFields(reportData, { includeEmpty: true })

    // Assouplir les champs requis: on fournira des valeurs par défaut si absents
    if (!reportData.interventionDate || !reportData.site) {
      return NextResponse.json(
        { error: 'Champs requis manquants: interventionDate et site' },
        { status: 400 }
      )
    }
    
    // Vérification que le technicien existe
      const technician = await Technician.findById(technicianId)
    if (!technician || !technician.isActive) {
      return NextResponse.json(
        { error: 'Technicien non autorisé' },
        { status: 403 }
      )
    }
      
      // Calcul automatique de la durée si startTime/endTime fournis
      let duration = reportData.duration
    if (reportData.startTime && reportData.endTime && !duration) {
      const start = new Date(`2000-01-01T${reportData.startTime}`)
      const end = new Date(`2000-01-01T${reportData.endTime}`)
      duration = Math.round((end.getTime() - start.getTime()) / 60000)
    }
      
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

      const photos = typeof reportData.photos === 'object' && reportData.photos !== null
        ? {
            before: Array.isArray(reportData.photos.before)
              ? reportData.photos.before
                  .map((photo: any) => ({
                    url: toNonEmptyString(photo.url) || '',
                    caption: toNonEmptyString(photo.caption),
                    timestamp: toDate(photo.timestamp) || new Date(),
                    gps: photo.gps
                  }))
                  .filter((p: any) => p.url)
              : [],
            after: Array.isArray(reportData.photos.after)
              ? reportData.photos.after
                  .map((photo: any) => ({
                    url: toNonEmptyString(photo.url) || '',
                    caption: toNonEmptyString(photo.caption),
                    timestamp: toDate(photo.timestamp) || new Date(),
                    gps: photo.gps
                  }))
                  .filter((p: any) => p.url)
              : []
          }
        : { before: [], after: [] }
    
    // Création du rapport avec valeurs par défaut compatibles schéma
    const newReport = new MaintenanceReport({
      technicianId,
        clientId: reportData.clientId ?? new mongoose.Types.ObjectId(),
        projectId: reportData.projectId ?? new mongoose.Types.ObjectId(),
      interventionDate: new Date(reportData.interventionDate),
      startTime: reportData.startTime || '08:00',
      endTime: reportData.endTime || '09:00',
      duration,
      site: reportData.site,
      interventionType: (reportData.interventionType || 'maintenance'),
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
        clientAcknowledgement,
        photos,
      signatures: {
        technician: reportData.technicianSignature
          ? { signature: reportData.technicianSignature, name: reportData.technician || 'Technicien', timestamp: new Date() }
          : undefined,
        client: reportData.clientSignature
          ? { signature: reportData.clientSignature, name: reportData.clientName || '', title: reportData.clientTitle || '', timestamp: new Date() }
          : undefined,
      },
        gpsLocation: reportData.gpsLocation,
        status: reportData.status || 'draft',
        priority,
      version: 1,
      analytics: {
        timeToComplete: 0,
        revisionCount: 0
      }
    })
    
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
    console.error('Erreur création rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du rapport' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour rapport
export async function PUT(request: NextRequest) {
  try {
    await connectMongoose()
    
    const { technicianId } = await verifyTechnicianToken(request)
      const updateData = await request.json()
    const reportId = updateData.reportId
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'ID du rapport requis' },
        { status: 400 }
      )
    }
    
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

      const structuredUpdates = extractStructuredFields(updateData, {
        current: {
          followUpRecommendations: existingReport.followUpRecommendations,
          billing: existingReport.billing
        }
      })

      ;['issuesDetected', 'materialsUsed', 'followUpRecommendations', 'nextActions', 'billing', 'clientAcknowledgement'].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(updateData, key)) {
          delete updateData[key]
        }
      })
    
      // Vérification statut modifiable
    if (['validated', 'published', 'archived'].includes(existingReport.status)) {
      return NextResponse.json(
        { error: 'Rapport non modifiable dans cet état' },
        { status: 403 }
      )
    }
    
    // Calcul durée si nécessaire
    if (updateData.startTime && updateData.endTime && !updateData.duration) {
      const start = new Date(`2000-01-01T${updateData.startTime}`)
      const end = new Date(`2000-01-01T${updateData.endTime}`)
      updateData.duration = Math.round((end.getTime() - start.getTime()) / 60000)
    }

      if (Object.prototype.hasOwnProperty.call(updateData, 'tasksPerformed')) {
        updateData.tasksPerformed = sanitizeStringArray(updateData.tasksPerformed)
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'recommendations')) {
        updateData.recommendations = sanitizeStringArray(updateData.recommendations)
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'initialObservations')) {
        updateData.initialObservations = toNonEmptyString(updateData.initialObservations) || existingReport.initialObservations
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'results')) {
        updateData.results = toNonEmptyString(updateData.results) || existingReport.results
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'problemSeverity')) {
        const candidate = String(updateData.problemSeverity || '').toLowerCase()
        updateData.problemSeverity = ISSUE_SEVERITIES.has(candidate) ? candidate : existingReport.problemSeverity
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'priority')) {
        const candidate = String(updateData.priority || '').toLowerCase()
        updateData.priority = REPORT_PRIORITIES.has(candidate) ? candidate : existingReport.priority
      }

      delete updateData.reportId
      delete updateData._id
      delete updateData.technicianId
    
    // Mise à jour
    const updatedReport = await MaintenanceReport.findByIdAndUpdate(
      reportId,
      {
          ...updateData,
          ...structuredUpdates,
        version: existingReport.version + 1,
        'analytics.revisionCount': existingReport.analytics.revisionCount + 1
      },
      { new: true, runValidators: true }
    ).populate('clientId', 'name company')
     .populate('projectId', 'name')
    
    // Ajout historique
    updatedReport!.addHistoryEntry('updated', technicianId, {
      previousStatus: existingReport.status,
      newStatus: updateData.status || existingReport.status,
      fieldsChanged: Object.keys(updateData)
    })
    
    await updatedReport!.save()
    
    return NextResponse.json({
      success: true,
      report: updatedReport,
      message: 'Rapport mis à jour avec succès'
    })

  } catch (error) {
    console.error('Erreur mise à jour rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}