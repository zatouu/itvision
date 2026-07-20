import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
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

    const sanitized = await Promise.all(clients.map(async (client) => {
      const activeContracts = Array.isArray(client.contracts)
        ? client.contracts.filter((contract) => contract.status === 'active')
        : []

      const contractsWithProject = await Promise.all(activeContracts.map(async (contract) => {
        let projectId: string | undefined
        try {
          const contractDoc = await MaintenanceContract.findOne({
            $or: [
              { contractNumber: contract.contractId },
              ...(String(contract.contractId).match(/^[0-9a-fA-F]{24}$/) ? [{ _id: contract.contractId }] : [])
            ],
            status: 'active'
          }).select('projectId').lean() as any
          projectId = contractDoc?.projectId?.toString?.()
        } catch (e) {
          console.error('[tech/clients] Erreur recherche contrat:', e)
        }
        return {
          contractId: contract.contractId,
          projectId,
          type: contract.type,
          startDate: contract.startDate,
          endDate: contract.endDate
        }
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
    }))

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

