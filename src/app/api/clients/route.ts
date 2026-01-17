import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { safeSearchRegex } from '@/lib/security-utils'
import Client from '@/lib/models/Client'
import { requireAuth } from '@/lib/jwt'

async function requireClientAccess(request: NextRequest) {
  try {
    const { userId, role } = await requireAuth(request)
    const allowed = ['ADMIN', 'TECHNICIAN', 'PRODUCT_MANAGER'].includes(role)
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const, userId, role }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  }
}

// GET - Lister les clients (accessible aux techniciens)
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireClientAccess(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    const query: any = { isActive: true }
    if (q) {
      const searchRegex = safeSearchRegex(q)
      query.$or = [
        { name: searchRegex },
        { prenom: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { entreprise: searchRegex },
        { contactPrincipal: searchRegex },
        { company: searchRegex }
      ]
    }

    const clients = await Client.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-passwordHash -loginAttempts -lockedUntil -contracts')
      .lean()

    // Formater les clients pour l'affichage
    const formattedClients = clients.map((client: any) => {
      const displayName = client.type === 'Entreprise' 
        ? (client.entreprise || client.name)
        : `${client.name} ${client.prenom || ''}`.trim()
      
      return {
        id: String(client._id),
        _id: String(client._id),
        name: displayName,
        email: client.email,
        phone: client.phone,
        type: client.type,
        entreprise: client.entreprise,
        contactPrincipal: client.contactPrincipal
      }
    })

    return NextResponse.json({ 
      success: true, 
      clients: formattedClients,
      total: formattedClients.length
    })
  } catch (error) {
    console.error('Erreur récupération clients:', error)
    const message = error instanceof Error ? error.message : 'Erreur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}








