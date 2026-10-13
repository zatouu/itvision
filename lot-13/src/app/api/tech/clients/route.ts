import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import mongoose from 'mongoose'
import Client from '@/lib/models/Client'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'
import { requireAuth } from '@/lib/jwt'
import { resolveTechnicianId } from '@/lib/interventions-access'

type DecodedToken = {
  id: string
  role: string
  email?: string
}

const ALLOWED_ROLES = new Set(['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'])

async function requireTechnicianOrAdmin(request: NextRequest): Promise<DecodedToken> {
  const { userId, role, email } = await requireAuth(request) as { userId: string; role: string; email?: string }
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error('Accès non autorisé')
  }
  return { id: userId, role, email }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireTechnicianOrAdmin(request)

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().slice(0, 80)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0', 10), 0)

    const query: Record<string, unknown> = { archivedAt: null }

    // Un technicien ne voit que les clients de ses interventions
    const visitsByClient = new Map<string, { count: number; last: Date | null; next: Date | null }>()
    if (auth.role === 'TECHNICIAN') {
      const techId = await resolveTechnicianId(auth.email)
      if (!techId) return NextResponse.json({ success: true, clients: [], count: 0, total: 0 })
      const tid = new mongoose.Types.ObjectId(techId)
      const now = new Date()
      const visits = await Intervention.aggregate([
        { $match: { $or: [{ technicienId: tid }, { assignedTechnician: tid }], clientId: { $ne: null } } },
        { $group: {
          _id: '$clientId',
          count: { $sum: 1 },
          last: { $max: { $cond: [{ $lte: ['$date', now] }, '$date', null] } },
          next: { $min: { $cond: [{ $and: [{ $gt: ['$date', now] }, { $in: ['$status', ['scheduled', 'pending']] }] }, '$date', null] } },
        } },
      ])
      for (const v of visits) visitsByClient.set(String(v._id), { count: v.count, last: v.last, next: v.next })
      query._id = { $in: visits.map(v => v._id) }
    }

    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { company: regex }
      ]
    }

    const [clients, total, totalClients, activeClients, portalEnabled] = await Promise.all([
      Client.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Client.countDocuments(query),
      Client.countDocuments({ archivedAt: null }),
      Client.countDocuments({ archivedAt: null, isActive: true }),
      Client.countDocuments({ archivedAt: null, 'permissions.canAccessPortal': true })
    ])

    // Collecter tous les identifiants de contrats actifs pour une seule requête batch
    const activeContractsByClient = new Map<string, any[]>()
    const contractNumberSet = new Set<string>()
    const objectIdSet = new Set<string>()

    for (const client of clients) {
      const activeContracts = Array.isArray(client.contracts)
        ? client.contracts.filter((contract) => contract.status === 'active')
        : []
      activeContractsByClient.set(String(client._id), activeContracts)

      for (const contract of activeContracts) {
        const cid = String(contract.contractId)
        contractNumberSet.add(cid)
        if (mongoose.Types.ObjectId.isValid(cid)) {
          objectIdSet.add(cid)
        }
      }
    }

    const contractNumberList = Array.from(contractNumberSet)
    const objectIdList = Array.from(objectIdSet)

    const contractDocs = await MaintenanceContract.find({
      status: 'active',
      $or: [
        ...(contractNumberList.length > 0 ? [{ contractNumber: { $in: contractNumberList } }] : []),
        ...(objectIdList.length > 0 ? [{ _id: { $in: objectIdList.map((id) => new mongoose.Types.ObjectId(id)) } }] : []),
      ],
    }).select('contractNumber projectId').lean() as any[]

    const projectByContractId = new Map<string, string>()
    for (const doc of contractDocs) {
      if (doc.projectId) {
        projectByContractId.set(String(doc._id), String(doc.projectId))
        if (doc.contractNumber) projectByContractId.set(doc.contractNumber, String(doc.projectId))
      }
    }

    const sanitized = clients.map((client) => {
      const activeContracts = activeContractsByClient.get(String(client._id)) || []

      const contractsWithProject = activeContracts.map((contract) => ({
        contractId: contract.contractId,
        projectId: projectByContractId.get(String(contract.contractId)),
        type: contract.type,
        startDate: contract.startDate,
        endDate: contract.endDate,
      }))

      return {
        id: String(client._id),
        clientId: client.clientId,
        name: client.name,
        company: client.company,
        contactPerson: client.contactPerson,
        email: client.email,
        phone: client.phone,
        address: client.address,
        city: (client as any).city,
        isActive: client.isActive,
        permissions: client.permissions,
        activeContracts: contractsWithProject,
        visits: visitsByClient.get(String(client._id)) || null
      }
    })

    return NextResponse.json({
      success: true,
      clients: sanitized,
      count: sanitized.length,
      total,
      metrics: {
        totalClients,
        activeClients,
        portalEnabledClients: portalEnabled
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    const status = message.includes('auth') ? 401 : message.includes('autorisé') ? 403 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

