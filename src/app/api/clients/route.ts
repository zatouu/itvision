import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectMongoose } from '@/lib/mongoose'
import Client from '@/lib/models/Client'

function requireAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { ok: false, status: 401, error: 'Non authentifié' as const }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    const role = String(decoded.role || '').toUpperCase()
    // Permettre ADMIN, TECHNICIAN et PRODUCT_MANAGER
    const allowed = ['ADMIN', 'TECHNICIAN', 'PRODUCT_MANAGER'].includes(role)
    if (!allowed) return { ok: false, status: 403, error: 'Accès refusé' as const }
    return { ok: true, userId: decoded.userId, role }
  } catch {
    return { ok: false, status: 401, error: 'Token invalide' as const }
  }
}

// GET - Lister les clients (accessible aux techniciens)
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    const query: any = { isActive: true }
    if (q) {
      query.$or = [
        { name: new RegExp(q, 'i') },
        { prenom: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { entreprise: new RegExp(q, 'i') },
        { contactPrincipal: new RegExp(q, 'i') },
        { company: new RegExp(q, 'i') }
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








