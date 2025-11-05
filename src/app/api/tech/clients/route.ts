import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectMongoose } from '@/lib/mongoose'
import Client from '@/lib/models/Client'

type DecodedToken = {
  id: string
  role: string
}

const ALLOWED_ROLES = new Set(['TECHNICIAN', 'ADMIN'])

function requireTechnicianOrAdmin(request: NextRequest): DecodedToken {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    throw new Error('Non authentifié')
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as DecodedToken
  const role = String(decoded.role || '').toUpperCase()

  if (!ALLOWED_ROLES.has(role)) {
    throw new Error('Accès non autorisé')
  }

  return { id: decoded.id, role }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    requireTechnicianOrAdmin(request)

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

    const sanitized = clients.map((client) => ({
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
      activeContracts: Array.isArray(client.contracts)
        ? client.contracts.filter((contract) => contract.status === 'active').map((contract) => ({
            contractId: contract.contractId,
            type: contract.type,
            startDate: contract.startDate,
            endDate: contract.endDate
          }))
        : []
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

