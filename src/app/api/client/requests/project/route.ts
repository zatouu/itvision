/**
 * API Route - Demande de Nouveau Projet par le Client
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import User from '@/lib/models/User'
import { emitGroupNotification } from '@/lib/socket-emit'

interface DecodedToken {
  userId: string
  role: string
  email: string
}

async function verifyToken(request: NextRequest): Promise<DecodedToken> {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('Non authentifié')
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
  const { payload } = await jwtVerify(token, secret)
  
  if (!payload.userId || !payload.role || !payload.email) {
    throw new Error('Token invalide')
  }
  
  return {
    userId: payload.userId as string,
    role: payload.role as string,
    email: payload.email as string
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, role, email } = await verifyToken(request)
    
    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    await connectMongoose()

    const body = await request.json()
    const { name, serviceType, description, estimatedBudget, address, preferredStartDate, urgency } = body

    // Validation
    if (!name || !serviceType || !description || !address) {
      return NextResponse.json({ 
        error: 'Nom, type de service, description et adresse sont requis' 
      }, { status: 400 })
    }

    // Récupérer les infos du client
    const client = await User.findById(userId).select('name email company phone').lean() as { name?: string; email?: string; company?: string; phone?: string } | null

    // Créer le projet avec statut "pending" (en attente de validation admin)
    const project = await Project.create({
      clientId: userId,
      name,
      serviceType,
      description,
      status: 'pending',
      progress: 0,
      address,
      estimatedBudget: estimatedBudget || null,
      preferredStartDate: preferredStartDate || null,
      urgency: urgency || 'normal',
      requestedBy: {
        name: client?.name,
        email: client?.email,
        company: client?.company,
        phone: client?.phone
      },
      timeline: [{
        date: new Date(),
        phase: 'Demande de projet',
        description: `Demande soumise par ${client?.name}`,
        status: 'completed'
      }],
      statusHistory: [{
        status: 'pending',
        date: new Date(),
        note: 'Demande de projet soumise par le client'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Notifier les admins en temps réel
    emitGroupNotification('admins', {
      type: 'info',
      title: 'Nouvelle Demande de Projet',
      message: `${client?.name || email} a demandé un nouveau projet : ${name}`,
      data: { projectId: project._id.toString() }
    })

    return NextResponse.json({
      success: true,
      message: 'Demande de projet envoyée avec succès',
      project: {
        _id: project._id.toString(),
        name: project.name,
        status: project.status,
        serviceType: project.serviceType
      }
    })
  } catch (error) {
    console.error('Erreur création demande projet:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// GET - Récupérer les demandes de projet du client
export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await verifyToken(request)
    
    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    await connectMongoose()

    const requests = await Project.find({ 
      clientId: userId,
      status: { $in: ['pending', 'planning'] }
    })
      .sort({ createdAt: -1 })
      .select('name serviceType description status estimatedBudget address preferredStartDate urgency createdAt')
      .lean()

    return NextResponse.json({
      success: true,
      requests: requests.map((r: any) => ({
        _id: r._id.toString(),
        name: r.name,
        serviceType: r.serviceType,
        description: r.description,
        status: r.status,
        estimatedBudget: r.estimatedBudget,
        address: r.address,
        preferredStartDate: r.preferredStartDate,
        urgency: r.urgency,
        createdAt: r.createdAt
      }))
    })
  } catch (error) {
    console.error('Erreur récupération demandes projet:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}





