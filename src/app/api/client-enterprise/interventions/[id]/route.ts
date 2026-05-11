import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT' || !auth.user.companyClientId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)

  const intervention = await Intervention.findOne({
    _id: new mongoose.Types.ObjectId(id),
    clientId: userId,
  }).lean() as any

  if (!intervention) {
    return NextResponse.json({ error: 'Intervention introuvable' }, { status: 404 })
  }

  const data = {
    _id: String(intervention._id),
    interventionNumber: intervention.interventionNumber,
    title: intervention.title,
    description: intervention.description,
    typeIntervention: intervention.typeIntervention,
    priority: intervention.priority,
    status: intervention.status,
    date: intervention.date,
    startTime: intervention.startTime,
    endTime: intervention.endTime,
    estimatedDuration: intervention.estimatedDuration,
    site: intervention.site,
    address: intervention.address,
    contactName: intervention.contactName,
    contactPhone: intervention.contactPhone,
    service: intervention.service,
    problemDescription: intervention.problemDescription,
    diagnosis: intervention.diagnosis,
    solution: intervention.solution,
    notes: intervention.notes,
    cost: intervention.cost,
    isCoveredByContract: intervention.isCoveredByContract,
    materialsUsed: (intervention.materialsUsed || []).map((m: any) => ({
      name: m.name,
      quantity: m.quantity,
      unitPrice: m.unitPrice,
    })),
    tasks: (intervention.tasks || []).map((t: any) => ({
      description: t.description,
      status: t.status,
      duration: t.duration,
    })),
    documents: (intervention.documents || []).filter((d: any) => d.clientVisible !== false).map((d: any) => ({
      name: d.name,
      url: d.url,
      type: d.type,
      uploadedAt: d.uploadedAt,
    })),
    feedback: intervention.feedback ? {
      rating: intervention.feedback.rating,
      comment: intervention.feedback.comment,
      submittedAt: intervention.feedback.submittedAt,
    } : null,
    history: (intervention.history || []).map((h: any) => ({
      action: h.action,
      timestamp: h.timestamp,
      details: h.details,
    })),
    createdAt: intervention.createdAt,
    updatedAt: intervention.updatedAt,
  }

  return NextResponse.json({ intervention: data })
}
