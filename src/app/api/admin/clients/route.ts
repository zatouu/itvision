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
    const status = (searchParams.get('status') || '').trim()
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
    if (status === 'active') query.isActive = true
    if (status === 'inactive') query.isActive = false

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

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    requireAdmin(request)

    const body = await request.json()
    const { name, email, phone, company, address, city, country, canAccessPortal, notes, tags, category, rating } = body

    // Validation
    if (!name || !email || !phone) {
      return NextResponse.json({ 
        success: false, 
        error: 'Les champs nom, email et téléphone sont obligatoires' 
      }, { status: 400 })
    }

    // Vérifier si l'email existe déjà
    const existingClient = await Client.findOne({ email })
    if (existingClient) {
      return NextResponse.json({ 
        success: false, 
        error: 'Un client avec cet email existe déjà' 
      }, { status: 400 })
    }

    // Générer un clientId unique
    const count = await Client.countDocuments()
    const clientId = `CL${String(count + 1).padStart(4, '0')}`

    // Créer le client
    const client = await Client.create({
      clientId,
      name,
      email,
      phone,
      company: company || '',
      address: address || '',
      city: city || '',
      country: country || 'Sénégal',
      isActive: true,
      permissions: {
        canAccessPortal: canAccessPortal ?? true
      },
      notes: notes || '',
      tags: tags || [],
      category: category || '',
      rating: rating || 0,
      lastContact: new Date()
    })

    return NextResponse.json({ 
      success: true, 
      client,
      message: 'Client créé avec succès'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la création'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message, success: false }, { status })
  }
}
