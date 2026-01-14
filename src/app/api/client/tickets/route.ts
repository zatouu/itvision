import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import mongoose from 'mongoose'
import Ticket from '@/lib/models/Ticket'
import Project from '@/lib/models/Project'

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

export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await verifyToken(request)
    
    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    
    const query: any = { clientId: userId }
    if (status && status !== 'all') {
      query.status = status
    }
    if (category && category !== 'all') {
      query.category = category
    }

    const tickets = await Ticket.find(query)
      .sort({ updatedAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      tickets: tickets.map((t: any) => ({
        _id: t._id.toString(),
        ticketNumber: `TKT-${t._id.toString().slice(-6)}`,
        title: t.title,
        description: t.messages && t.messages.length > 0 ? t.messages[0].message : '',
        category: t.category,
        priority: t.priority,
        status: t.status,
        messages: t.messages || [],
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        resolvedAt: t.resolvedAt
      }))
    })
  } catch (error) {
    console.error('Erreur récupération tickets:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
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
    const { title, description, category, priority, projectId } = body

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Titre et description requis' },
        { status: 400 }
      )
    }

    // Mapper les catégories du portail client vers le modèle existant
    const categoryMap: Record<string, 'incident' | 'request' | 'change'> = {
      'technical': 'incident',
      'billing': 'request',
      'general': 'request',
      'urgent': 'incident'
    }
    
    const mappedCategory = categoryMap[category || 'general'] || 'request'

    // Si pas de projectId fourni, trouver un projet du client ou créer un ticket sans projet
    let finalProjectId = projectId
    if (!finalProjectId) {
      // Chercher le premier projet du client
      const clientProject = await Project.findOne({ clientId: userId }).select('_id').lean()
      if (clientProject) {
        finalProjectId = (clientProject as any)._id
      }
    }

    // Calculer le SLA
    const now = new Date()
    const targetHours = priority === 'urgent' ? 2 : priority === 'high' ? 4 : 24
    const deadline = new Date(now.getTime() + targetHours * 60 * 60 * 1000)

    const ticket = new Ticket({
      projectId: finalProjectId,
      clientId: new mongoose.Types.ObjectId(userId),
      assignedTo: [],
      watchers: [],
      title,
      category: mappedCategory,
      priority: priority || 'medium',
      status: 'open',
      channel: 'client_portal',
      tags: [],
      messages: [{
        authorId: new mongoose.Types.ObjectId(userId),
        authorRole: 'CLIENT',
        message: description,
        createdAt: new Date(),
        internal: false,
        attachments: []
      }],
      history: [{
        authorId: new mongoose.Types.ObjectId(userId),
        authorRole: 'CLIENT',
        action: 'message',
        payload: { message: 'Ticket créé' },
        createdAt: new Date()
      }],
      sla: {
        targetHours,
        startedAt: now,
        deadlineAt: deadline,
        breached: false
      }
    })

    await ticket.save()

    return NextResponse.json({
      success: true,
      message: 'Ticket créé avec succès',
      ticket: {
        _id: ticket._id.toString(),
        ticketNumber: `TKT-${ticket._id.toString().slice(-6)}`,
        title: ticket.title,
        status: ticket.status,
        category: ticket.category,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      }
    })
  } catch (error) {
    console.error('Erreur création ticket:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

