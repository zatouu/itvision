import { NextRequest, NextResponse } from 'next/server'
import Project from '@/lib/models/Project'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import { connectMongoose } from '@/lib/mongoose'
import { logDataAccess } from '@/lib/security-logger'
import { requireApiUser, authErrorResponse } from '@/lib/api-auth'
import mongoose from 'mongoose'
import { notifyProjectChange } from '@/lib/portal/project-notify'
import {
  canTransitionProject,
  checkProjectTransition,
  legacyProjectStatus,
  normalizeProjectStatus,
  PROJECT_STATUS_META,
  type ProjectStatus,
} from '@/lib/projects/workflow'
import { MIGRATION_REQUIRED_MESSAGE, updateProjectFields } from '@/lib/projects/persistence'
import { computeProjectFinance, syncProjectFinance } from '@/lib/finance/project-finance'

const verifyToken = (request: NextRequest) => requireApiUser(request)

function isAdminRole(role: any) {
  return ['ADMIN', 'SUPER_ADMIN'].includes(String(role || '').toUpperCase())
}

function asObjectIdString(value: any): string | null {
  const s = String(value || '').trim()
  if (!s) return null
  return /^[a-fA-F0-9]{24}$/.test(s) ? s : null
}

function normalizeProjectStatusForDb(value: any): ProjectStatus {
  return normalizeProjectStatus(value)
}

function normalizeProjectStatusForUi(value: any): string {
  return normalizeProjectStatus(value)
}

function buildStatusQuery(value: any): any {
  const requested = String(value || '').trim().toLowerCase()
  if (!requested || requested === 'all') return null

  // Base non migrée : les statuts détaillés sont stockés au format historique
  const target = normalizeProjectStatus(requested)
  return { $in: Array.from(new Set([requested, target, legacyProjectStatus(target)])) }
}

function normalizeServiceType(value: any, fallback = ''): string {
  const s = String(value ?? fallback ?? '').trim()
  return s
}

function normalizeProgressForDb(value: any, fallback = 0): number {
  const raw = value ?? fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.trunc(n)))
}

function normalizeValueForDb(value: any, fallback: any = 0): number {
  const raw = value === undefined || value === null || value === '' ? fallback : value
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

// GET - Récupérer les projets
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')
    
    // Construction du filtre selon le rôle
    const where: any = {}
    
    if (role === 'CLIENT') {
      // Les clients ne voient que leurs projets
      where.clientId = userId
    }
    // Les admins et techniciens voient tous les projets
    
    const statusQuery = buildStatusQuery(status)
    if (statusQuery) where.status = statusQuery
    
    // Récupération des projets (Mongoose)
    const query: any = {}
    if (where.clientId) query.clientId = where.clientId
    if (where.status) query.status = where.status
    const idParam = searchParams.get('id')
    if (idParam && mongoose.Types.ObjectId.isValid(idParam)) query._id = new mongoose.Types.ObjectId(idParam)

    const [projects, totalCount] = await Promise.all([
      Project.find(query)
        .populate('clientId', 'id name email phone')
        .populate('clientCompanyId', 'name company email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(query)
    ])
    
    const normalizedProjects = projects.map((project: any) => ({
      ...project,
      status: normalizeProjectStatusForUi(project?.status),
      serviceType: normalizeServiceType(project?.serviceType ?? project?.type),
      value: typeof project?.value === 'string' ? (parseFloat(project.value) || 0) : Number(project?.value || 0)
    }))

    logDataAccess('projects', 'read', request, userId, { count: normalizedProjects.length })
    
    return NextResponse.json({
      success: true,
      projects: normalizedProjects,
      pagination: {
        total: totalCount,
        page: Math.floor(skip / limit) + 1,
        limit,
        hasMore: skip + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Erreur récupération projets:', error)
    return NextResponse.json(
      { error: 'Accès non autorisé' },
      { status: 401 }
    )
  }
}

// POST - Créer un nouveau projet
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()

    // Désactiver le $jsonSchema validator MongoDB incompatible avec le schema Mongoose actuel
    try {
      const db = (mongoose.connection as any).db
      if (db) {
        const collections = await db.listCollections({ name: 'projects' }).toArray()
        const collInfo = collections.find((c: any) => c.name === 'projects')
        if (collInfo?.options?.validator) {
          await db.command({
            collMod: 'projects',
            validator: {},
            validationLevel: 'off'
          })
        }
      }
    } catch {
      // Ignorer si pas de permission ou déjà désactivé
    }

    const { userId, role } = await verifyToken(request)

    // Seuls les admins peuvent créer des projets
    if (!isAdminRole(role)) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }
    
    const projectData = await request.json()
    
    // Validation des données requises
    const requiredFields = ['name', 'address', 'clientId', 'startDate']
    for (const field of requiredFields) {
      if (!projectData[field]) {
        return NextResponse.json(
          { error: `Champ requis manquant: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Vérification que le client existe
    // clientId peut être un User._id (compte client) ou un Client._id (entreprise)
    const resolvedClientId = asObjectIdString(projectData.clientId)
    let resolvedClient: any = null
    let resolvedCompanyId = asObjectIdString(projectData.clientCompanyId)

    if (resolvedClientId) {
      // Essayer d'abord comme User._id avec role CLIENT
      resolvedClient = await User.findOne({ _id: resolvedClientId, role: 'CLIENT' }).lean()

      // Si non trouvé, essayer comme Client._id (entreprise) et chercher le User lié
      if (!resolvedClient) {
        const company = await Client.findById(resolvedClientId).lean() as any
        if (company?._id) {
          resolvedCompanyId = String(company._id)
          resolvedClient = await User.findOne({ companyClientId: resolvedCompanyId, role: 'CLIENT' }).lean()
        }
      }
    }

    if (!resolvedClient) {
      return NextResponse.json(
        { error: 'Client non trouvé. Assurez-vous que le client a un compte utilisateur actif.' },
        { status: 404 }
      )
    }

    const finalClientId = String(resolvedClient._id)

    if (resolvedCompanyId) {
      const company = await Client.findById(resolvedCompanyId).select({ _id: 1 }).lean() as any
      if (!company?._id) {
        return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
      }
    }
    
    // Création du projet — insertion native pour contourner le $jsonSchema validator incompatible
    const projectId = new mongoose.Types.ObjectId()
    const serviceType = normalizeServiceType(projectData.serviceType ?? projectData.type)

    const docToInsert = {
      _id: projectId,
      name: projectData.name,
      description: projectData.description || '',
      address: projectData.address,
      projectId: projectId.toString(),
      clientId: new mongoose.Types.ObjectId(finalClientId),
      clientCompanyId: resolvedCompanyId ? new mongoose.Types.ObjectId(resolvedCompanyId) : undefined,
      // Un projet naît en phase commerciale ; la suite passe par le workflow (devis accepté…)
      status: ['lead', 'quoted', 'negotiation'].includes(normalizeProjectStatusForDb(projectData.status || 'lead'))
        ? normalizeProjectStatusForDb(projectData.status || 'lead')
        : 'lead' as ProjectStatus,
      startDate: new Date(projectData.startDate),
      endDate: projectData.endDate ? new Date(projectData.endDate) : null,
      currentPhase: projectData.currentPhase || '',
      progress: normalizeProgressForDb(projectData.progress || 0),
      serviceType,
      type: serviceType,
      clientSnapshot: projectData.clientSnapshot || { company: '', contact: '', phone: '', email: '' },
      site: projectData.site || { name: '', address: '', access: '', constraints: [], contacts: [] },
      assignedTo: projectData.assignedTo || [],
      value: normalizeValueForDb(projectData.value || 0),
      margin: projectData.margin || 0,
      milestones: projectData.milestones || [],
      quote: projectData.quote || null,
      products: projectData.products || [],
      timeline: projectData.timeline || [],
      risks: projectData.risks || [],
      documents: projectData.documents || [],
      clientAccess: !!projectData.clientAccess,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    let legacyStorage = false
    try {
      await mongoose.connection.collection('projects').insertOne(docToInsert as any)
    } catch (insertError: any) {
      // Ancien validateur Mongo (avant migration) : statut et montant au format historique
      if (insertError?.code !== 121) throw insertError
      await mongoose.connection.collection('projects').insertOne({
        ...docToInsert,
        status: legacyProjectStatus(docToInsert.status),
        value: String(docToInsert.value),
      } as any)
      legacyStorage = true
    }

    const newProject = (await Project.findById(projectId)
      .populate('clientId', 'id name email phone')
      .populate('clientCompanyId', 'name company email phone')
      .lean()) as any

    if (!newProject) {
      return NextResponse.json(
        { error: 'Projet non trouvé après création' },
        { status: 404 }
      )
    }

    // Normaliser la réponse API pour l'UI
    if (newProject && typeof newProject.value === 'string') {
      newProject.value = parseFloat(newProject.value) || 0
    }
    if (newProject) {
      newProject.status = normalizeProjectStatusForUi(newProject.status)
      newProject.serviceType = normalizeServiceType(newProject.serviceType ?? newProject.type)
    }
    
    logDataAccess('projects', 'create', request, userId, { projectId: String(newProject._id) })
    
    return NextResponse.json({
      success: true,
      project: newProject,
      message: 'Projet créé avec succès',
      ...(legacyStorage ? { warning: MIGRATION_REQUIRED_MESSAGE } : {})
    }, { status: 201 })

  } catch (error: any) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur création projet:', error)
    console.error('errInfo details:', JSON.stringify(error?.errInfo || {}, null, 2))
    console.error('errorResponse:', JSON.stringify(error?.errorResponse || {}, null, 2))
    return NextResponse.json(
      { error: 'Erreur lors de la création du projet', details: error?.errInfo || error?.message },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un projet
export async function PUT(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)
    const updateData = await request.json()
    const projectId = updateData.id
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'ID du projet requis' },
        { status: 400 }
      )
    }
    
    // Seuls les admins peuvent modifier des projets
    if (!isAdminRole(role)) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }
    
    // Vérification que le projet existe
    const existingProject = await Project.findById(projectId)
    
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      )
    }

    const nextCompanyId = updateData.clientCompanyId === null
      ? null
      : (asObjectIdString(updateData.clientCompanyId) || undefined)

    if (typeof nextCompanyId === 'string') {
      const company = await Client.findById(nextCompanyId).select({ _id: 1 }).lean() as any
      if (!company?._id) {
        return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
      }
    }
    
    const nextServiceType = normalizeServiceType(
      updateData.serviceType ?? updateData.type,
      (existingProject as any).serviceType ?? (existingProject as any).type ?? ''
    )
    const nextProgress = normalizeProgressForDb(
      updateData.progress,
      Number((existingProject as any).progress || 0)
    )
    const nextValue = normalizeValueForDb(
      updateData.value,
      (existingProject as any).value ?? 0
    )

    // Changement de statut : contrôlé par le workflow (garde-fous détaillés via /api/projects/[id]/transition)
    const currentStatus = normalizeProjectStatus(existingProject.status)
    const requestedStatus = updateData.status ? normalizeProjectStatus(updateData.status, currentStatus) : currentStatus
    if (requestedStatus !== currentStatus && !canTransitionProject(currentStatus, requestedStatus)) {
      return NextResponse.json(
        { error: `Passage « ${PROJECT_STATUS_META[currentStatus].label} » → « ${PROJECT_STATUS_META[requestedStatus].label} » non prévu par le workflow` },
        { status: 409 }
      )
    }
    if (requestedStatus !== currentStatus) {
      const finance = await computeProjectFinance(projectId)
      const check = checkProjectTransition(currentStatus, requestedStatus, {
        acceptedQuotes: finance.acceptedQuotes,
        sentQuotes: finance.sentQuotes,
        tasksOpen: ((existingProject as any).tasks || []).filter((t: any) => t.status !== 'done').length,
        milestonesOpen: (existingProject.milestones || []).filter((m: any) => m.status !== 'completed').length,
        outstanding: finance.outstanding,
        remainingToInvoice: finance.remainingToInvoice,
        receptionSigned: !!(existingProject as any).reception?.signedAt,
      })
      if (check.blocking) {
        return NextResponse.json({ error: `${check.blocking} (passage forcé possible depuis le pipeline du projet, avec motif)` }, { status: 409 })
      }
    }

    // Mise à jour du projet (native Mongo pour éviter le cast Mongoose sur value)
    const setData: any = {
      name: updateData.name ?? existingProject.name,
      description: updateData.description ?? existingProject.description,
      address: updateData.address ?? existingProject.address,
      status: normalizeProjectStatusForDb(requestedStatus),
      endDate: updateData.endDate !== undefined ? (updateData.endDate ? new Date(updateData.endDate) : null) : existingProject.endDate,
      currentPhase: updateData.currentPhase ?? existingProject.currentPhase,
      progress: nextProgress,
      serviceType: nextServiceType,
      type: nextServiceType,
      clientSnapshot: updateData.clientSnapshot ?? existingProject.clientSnapshot,
      site: updateData.site ?? existingProject.site,
      assignedTo: updateData.assignedTo ?? existingProject.assignedTo,
      value: nextValue,
      margin: typeof updateData.margin === 'number' ? updateData.margin : existingProject.margin,
      milestones: updateData.milestones ?? existingProject.milestones,
      quote: updateData.quote ?? existingProject.quote,
      products: updateData.products ?? existingProject.products,
      timeline: updateData.timeline ?? existingProject.timeline,
      risks: updateData.risks ?? existingProject.risks,
      documents: updateData.documents ?? existingProject.documents,
      sharedNotes: updateData.sharedNotes ?? (existingProject as any).sharedNotes ?? [],
      clientAccess: typeof updateData.clientAccess === 'boolean' ? updateData.clientAccess : existingProject.clientAccess,
      updatedAt: new Date()
    }

    if (nextCompanyId === null) {
      setData.clientCompanyId = null
    } else if (typeof nextCompanyId === 'string') {
      setData.clientCompanyId = new mongoose.Types.ObjectId(nextCompanyId)
    }

    const statusChanged = setData.status !== currentStatus
    const { legacy: legacyStorage } = await updateProjectFields(
      existingProject._id as any,
      setData,
      statusChanged
        ? { push: { statusHistory: { date: new Date(), status: setData.status, author: userId, note: 'Modification de la fiche projet' } } }
        : {}
    )
    // Le montant d'un projet ayant des devis acceptés reste celui des devis (pas de double saisie)
    await syncProjectFinance(projectId).catch(e => console.error('[projects] synchro montants:', e))

    const updatedProject = (await Project.findById(projectId)
      .populate('clientId', 'id name email phone')
      .populate('clientCompanyId', 'name company email phone')
      .lean()) as any

    if (!updatedProject) {
      return NextResponse.json(
        { error: 'Projet non trouvé après mise à jour' },
        { status: 404 }
      )
    }
    
    if (updatedProject) {
      updatedProject.status = normalizeProjectStatusForUi(updatedProject.status)
      updatedProject.serviceType = normalizeServiceType(updatedProject.serviceType ?? updatedProject.type)
      if (typeof updatedProject.value === 'string') {
        updatedProject.value = parseFloat(updatedProject.value) || 0
      }
    }

    logDataAccess('projects', 'update', request, userId, { projectId: String(updatedProject._id) })

    void notifyProjectChange(
      (existingProject as any).toObject(),
      { ...setData, _id: existingProject._id, clientCompanyId: setData.clientCompanyId === undefined ? (existingProject as any).clientCompanyId : setData.clientCompanyId }
    ).catch(e => console.error('[projects] notification:', e))
    
    return NextResponse.json({
      success: true,
      project: updatedProject,
      message: 'Projet mis à jour avec succès',
      ...(legacyStorage ? { warning: MIGRATION_REQUIRED_MESSAGE } : {})
    })

  } catch (error: any) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur mise à jour projet:', error)
    console.error('errInfo details:', JSON.stringify(error?.errInfo || {}, null, 2))
    console.error('errorResponse:', JSON.stringify(error?.errorResponse || {}, null, 2))
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour', details: error?.errInfo || error?.message },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un projet
export async function DELETE(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)

    if (!isAdminRole(role)) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    let projectId: string | null = null
    try {
      const body = await request.json()
      projectId = body?.id || body?._id || null
    } catch {
      // Aucun corps JSON, on tentera d'utiliser les query params
    }

    if (!projectId) {
      const { searchParams } = new URL(request.url)
      projectId = searchParams.get('id')
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'ID du projet requis' },
        { status: 400 }
      )
    }

    const existingProject = await Project.findById(projectId)
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      )
    }

    await Project.deleteOne({ _id: projectId })

    logDataAccess('projects', 'delete', request, userId, { projectId: String(projectId) })

    return NextResponse.json({
      success: true,
      message: 'Projet supprimé avec succès'
    })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur suppression projet:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du projet' },
      { status: 500 }
    )
  }
}