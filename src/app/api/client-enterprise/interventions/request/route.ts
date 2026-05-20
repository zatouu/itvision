import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { addNotification } from '@/lib/notifications-memory'

export async function POST(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT' || !auth.user.companyClientId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)
  const body = await request.json()

  const { title, description, typeIntervention, priority, site, preferredDate } = body
  if (!title || !description || !typeIntervention) {
    return NextResponse.json({ error: 'Titre, description et type requis' }, { status: 400 })
  }

  const validTypes = ['maintenance', 'installation', 'repair', 'inspection', 'emergency']
  if (!validTypes.includes(typeIntervention)) {
    return NextResponse.json({ error: 'Type intervention invalide' }, { status: 400 })
  }

  // Auto-détection contrat actif
  const now = new Date()
  const activeContract = await MaintenanceContract.findOne({
    clientId: userId,
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).lean() as any

  let maintenanceContractId: mongoose.Types.ObjectId | undefined
  let isCoveredByContract = false
  let overageAlert = false

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

  const intervention = await Intervention.create({
    title,
    description,
    clientId: userId,
    typeIntervention,
    service: typeIntervention,
    priority: priority || 'medium',
    status: 'pending',
    site: site || undefined,
    date: preferredDate ? new Date(preferredDate) : undefined,
    maintenanceContractId,
    isCoveredByContract
  })

  // Notification admin
  addNotification({
    userId: 'admin',
    type: 'info',
    title: 'Nouvelle demande intervention client',
    message: `${auth.user.name || auth.user.email} a demandé une intervention : ${title}`,
    actionUrl: `/admin/maintenance/interventions/${intervention._id}`,
    metadata: { interventionId: String(intervention._id), clientId: String(userId) }
  })

  return NextResponse.json({
    success: true,
    intervention,
    ...(overageAlert && { warning: 'Plafond interventions du contrat atteint. Intervention hors contrat.' })
  }, { status: 201 })
}
