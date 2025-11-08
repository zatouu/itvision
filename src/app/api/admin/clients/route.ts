import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectMongoose } from '@/lib/mongoose'
import Client from '@/lib/models/Client'

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  if (decoded.role !== 'ADMIN') throw new Error('Accès non autorisé')
  return decoded
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const company = (searchParams.get('company') || '').trim()
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')

    const query: any = {}
    if (q) {
      query.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { company: new RegExp(q, 'i') },
      ]
    }
    if (company) query.company = new RegExp(company, 'i')

    const [clientsRaw, total, totalClients, activeClients, portalEnabledClients] = await Promise.all([
      Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Client.countDocuments(query),
      Client.countDocuments({}),
      Client.countDocuments({ isActive: true }),
      Client.countDocuments({ 'permissions.canAccessPortal': true })
    ])

    // Enrichir les clients avec les contrats actifs calculés
    const clients = clientsRaw.map((client: any) => ({
      ...client,
      activeContracts: Array.isArray(client.contracts)
        ? client.contracts.filter((contract: any) => {
            const isActive = contract.status === 'active'
            const notExpired = !contract.endDate || new Date(contract.endDate) > new Date()
            return isActive && notExpired
          }).map((contract: any) => ({
            contractId: contract.contractId,
            type: contract.type
          }))
        : []
    }))

    return NextResponse.json({ 
      success: true, 
      clients, 
      total, 
      skip, 
      limit,
      metrics: {
        totalClients,
        activeClients,
        portalEnabledClients
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
