/**
 * API Installations - Module techniciens
 * 
 * Endpoints:
 * - POST /api/installations - Créer une installation
 * - GET /api/installations - Lister les installations
 * - PATCH /api/installations/[id] - Mettre à jour le statut
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Installation from '@/lib/models/Installation'
import MaintenanceActivity from '@/lib/models/MaintenanceActivity'
import { requireApiUser, authErrorResponse } from '@/lib/api-auth'

/**
 * POST /api/installations
 * Crée une nouvelle installation depuis un achat produit
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    await connectMongoose()
    const body = await request.json()
    const {
      productId,
      productName,
      orderId,
      clientName,
      clientEmail,
      clientPhone,
      address,
      includeMaterials,
      preferredDate,
      notes,
      quantity = 1
    } = body
    // Un client ne peut créer une installation que pour lui-même
    const clientId = user.role === 'CLIENT' ? user.userId : body.clientId

    // Validation
    if (!productId || !productName || !clientName || !clientPhone || !address) {
      return NextResponse.json(
        { error: 'Informations incomplètes pour créer une installation' },
        { status: 400 }
      )
    }

    const parsedPreferredDate = preferredDate ? new Date(preferredDate) : undefined

    // Créer l'installation
    const installation = await Installation.create({
      productId,
      productName,
      orderId,
      clientId,
      clientName,
      clientContact: {
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        address
      },
      installationOptions: {
        includeMaterials: Boolean(includeMaterials),
        preferredDate: parsedPreferredDate,
        notes,
        quantity: Number(quantity) || 1
      },
      status: 'pending',
      allowMarketplace: true,
      scheduledDate: parsedPreferredDate
    })

    // Créer aussi une MaintenanceActivity pour le marketplace
    const activity = await MaintenanceActivity.create({
      category: 'product_install',
      clientName,
      clientContact: {
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        address
      },
      site: address,
      date: parsedPreferredDate || new Date(),
      isContractual: false,
      allowMarketplace: true,
      productId,
      productName,
      installationOptions: {
        includeMaterials: Boolean(includeMaterials),
        preferredDate: parsedPreferredDate,
        notes,
        quantity: Number(quantity) || 1
      },
      status: 'open'
    })

    return NextResponse.json({
      success: true,
      installation: {
        id: installation._id.toString(),
        status: installation.status,
        scheduledDate: installation.scheduledDate
      },
      activityId: activity._id.toString()
    }, { status: 201 })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur création installation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * GET /api/installations
 * Liste les installations avec filtres
 */
export async function GET(request: NextRequest) {
  try {
    const { role, userId } = await requireApiUser(request)
    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const technicianId = searchParams.get('technicianId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit

    const filter: any = {}

    // Filtres selon rôle
    if (role === 'CLIENT') {
      filter.clientId = userId
    } else if (role === 'TECHNICIAN') {
      filter.assignedTechnicianId = userId
    }

    if (status) filter.status = status
    if (clientId) filter.clientId = clientId
    if (technicianId) filter.assignedTechnicianId = technicianId

    const [installations, total] = await Promise.all([
      Installation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Installation.countDocuments(filter)
    ])

    return NextResponse.json({
      success: true,
      installations: installations.map((inst: any) => ({
        id: String(inst._id),
        productId: String(inst.productId),
        productName: inst.productName,
        clientName: inst.clientName,
        clientContact: inst.clientContact,
        installationOptions: inst.installationOptions,
        status: inst.status,
        assignedTechnicianId: inst.assignedTechnicianId ? String(inst.assignedTechnicianId) : undefined,
        assignedTechnicianName: inst.assignedTechnicianName,
        scheduledDate: inst.scheduledDate,
        completedDate: inst.completedDate,
        createdAt: inst.createdAt
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur récupération installations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

