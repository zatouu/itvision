/**
 * API Route - Demande d'Intervention par le Client
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import Ticket from '@/lib/models/Ticket'
import User from '@/lib/models/User'
import { emitGroupNotification } from '@/lib/socket-emit'
import { getJwtSecretKey } from '@/lib/jwt-secret'

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

  const secret = getJwtSecretKey()
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

function generateTicketNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `INT-${year}${month}-${random}`
}

export async function POST(request: NextRequest) {
  try {
    const { userId, role, email } = await verifyToken(request)
    
    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    await connectMongoose()

    const body = await request.json()
    const { 
      type, // 'urgent' | 'scheduled'
      title,
      description, 
      site, 
      preferredDate,
      projectId // optionnel
    } = body

    // Validation
    if (!type || !title || !description || !site) {
      return NextResponse.json({ 
        error: 'Type, titre, description et site sont requis' 
      }, { status: 400 })
    }

    // Récupérer les infos du client
    const client = await User.findById(userId).select('name email company phone').lean() as { name?: string; email?: string; company?: string; phone?: string } | null

    // Déterminer la priorité selon le type
    const priority = type === 'urgent' ? 'urgent' : 'high'

    // Créer un ticket de type intervention
    const ticket = await Ticket.create({
      ticketNumber: generateTicketNumber(),
      clientId: userId,
      projectId: projectId || null,
      title,
      description: `${description}\n\n📍 Site: ${site}\n📅 Date souhaitée: ${preferredDate || 'Dès que possible'}`,
      category: 'technical',
      priority,
      status: 'open',
      messages: [{
        authorId: userId,
        authorName: client?.name || email,
        authorRole: 'CLIENT',
        message: description,
        createdAt: new Date(),
        isStaff: false
      }],
      metadata: {
        type: 'intervention_request',
        interventionType: type,
        site,
        preferredDate: preferredDate || null
      },
      tags: ['intervention', type],
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Notifier les admins et techniciens en temps réel
    emitGroupNotification('admins', {
      type: type === 'urgent' ? 'warning' : 'info',
      title: type === 'urgent' ? '🚨 Intervention Urgente' : 'Nouvelle Demande d\'Intervention',
      message: `${client?.name || email} demande une intervention : ${title}`,
      data: { ticketId: ticket._id.toString() }
    })

    emitGroupNotification('technicians', {
      type: type === 'urgent' ? 'warning' : 'info',
      title: type === 'urgent' ? '🚨 Intervention Urgente' : 'Nouvelle Demande d\'Intervention',
      message: `${client?.name || email} - ${site}`,
      data: { ticketId: ticket._id.toString() }
    })

    return NextResponse.json({
      success: true,
      message: 'Demande d\'intervention envoyée avec succès',
      ticket: {
        _id: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status
      }
    })
  } catch (error) {
    console.error('Erreur création demande intervention:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// GET - Récupérer les demandes d'intervention du client
export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await verifyToken(request)
    
    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    await connectMongoose()

    const requests = await Ticket.find({ 
      clientId: userId,
      category: 'technical',
      'metadata.type': 'intervention_request'
    })
      .sort({ createdAt: -1 })
      .select('ticketNumber title priority status metadata createdAt')
      .lean()

    return NextResponse.json({
      success: true,
      requests: requests.map((r: any) => ({
        _id: r._id.toString(),
        ticketNumber: r.ticketNumber,
        title: r.title,
        priority: r.priority,
        status: r.status,
        type: r.metadata?.interventionType,
        site: r.metadata?.site,
        preferredDate: r.metadata?.preferredDate,
        createdAt: r.createdAt
      }))
    })
  } catch (error) {
    console.error('Erreur récupération demandes intervention:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}





