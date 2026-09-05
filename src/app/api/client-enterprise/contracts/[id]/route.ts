import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, companyScope } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(access.userId)
  const companyId = access.profiles.companyClientId

  const contract = await MaintenanceContract.findOne({
    _id: new mongoose.Types.ObjectId(id),
    ...companyScope({ userId, companyId }),
  }).lean() as any

  if (!contract) {
    return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
  }

  // Interventions liées
  const interventions = await Intervention.find({
    ...companyScope({ userId, companyId }),
    contractId: contract._id,
  })
    .sort({ date: -1 })
    .limit(20)
    .select('interventionNumber title typeIntervention priority status date site cost notes createdAt updatedAt')
    .lean() as any[]

  const data = {
    _id: String(contract._id),
    contractNumber: contract.contractNumber,
    name: contract.name,
    type: contract.type,
    status: contract.status,
    startDate: contract.startDate,
    endDate: contract.endDate,
    annualPrice: contract.annualPrice,
    description: contract.description,
    autoRenewal: !!contract.autoRenewal,
    coverage: contract.coverage || {},
    equipment: (contract.equipmentCovered || []).map((e: any) => ({
      name: e.name,
      model: e.model,
      serialNumber: e.serialNumber,
      serialNumbers: e.serialNumbers,
      quantity: e.quantity,
      installationDate: e.installationDate,
      warrantyEndDate: e.warrantyEndDate,
      location: e.location,
    })),
    preferredTechnicians: (contract.preferredTechnicians || []).map((t: any) => String(t)),
    documents: (contract.documents || []).filter((d: any) => d.clientVisible !== false).map((d: any) => ({
      name: d.name,
      url: d.url,
      type: d.type,
      uploadedAt: d.uploadedAt,
    })),
    history: (contract.history || []).map((h: any) => ({
      date: h.date,
      action: h.action,
      note: h.note,
    })),
    stats: contract.stats || {},
    interventions: interventions.map(i => ({
      _id: String(i._id),
      interventionNumber: i.interventionNumber,
      title: i.title,
      typeIntervention: i.typeIntervention,
      priority: i.priority,
      status: i.status,
      date: i.date,
      site: i.site,
      cost: i.cost,
      notes: i.notes,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })),
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  }

  return NextResponse.json({ contract: data })
}
