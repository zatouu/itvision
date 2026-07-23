import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import mongoose from 'mongoose'
import Client from '@/lib/models/Client'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { requireAuth } from '@/lib/jwt'

type DecodedToken = {
  id: string
  role: string
}

const ALLOWED_ROLES = new Set(['TECHNICIAN', 'ADMIN'])

async function requireTechnicianOrAdmin(request: NextRequest): Promise<DecodedToken> {
  const { userId, role } = await requireAuth(request)
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error('Accès non autorisé')
  }
  return { id: userId, role }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    await requireTechnicianOrAdmin(request)

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0', 10), 0)

    const query: Record<string, unknown> = {}

    if (q) {
      const regex = new RegExp(q, 'i')
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
      Client.countDocuments({}),
      Client.countDocuments({ isActive: true }),
      Client.countDocuments({ 'permissions.canAccessPortal': true })
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
        isActive: client.isActive,
        permissions: client.permissions,
        activeContracts: contractsWithProject
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

