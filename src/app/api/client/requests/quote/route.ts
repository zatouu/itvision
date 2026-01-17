/**
 * API Route - Demande de Devis par le Client
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
  return `DEV-${year}${month}-${random}`
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
      title,
      description, 
      category, // 'equipment' | 'service' | 'maintenance' | 'other'
      items, // Array de { name, quantity, specifications }
      estimatedBudget,
      deadline,
      attachments
    } = body

    // Validation
    if (!title || !description || !category) {
      return NextResponse.json({ 
        error: 'Titre, description et catégorie sont requis' 
      }, { status: 400 })
    }

    // Récupérer les infos du client
    const client = await User.findById(userId).select('name email company phone').lean() as { name?: string; email?: string; company?: string; phone?: string } | null

    // Formater la description avec les détails
    let fullDescription = description + '\n\n'
    
    if (items && items.length > 0) {
      fullDescription += '📦 Articles demandés:\n'
      items.forEach((item: any, index: number) => {
        fullDescription += `${index + 1}. ${item.name} - Quantité: ${item.quantity || 1}`
        if (item.specifications) {
          fullDescription += ` (${item.specifications})`
        }
        fullDescription += '\n'
      })
      fullDescription += '\n'
    }

    if (estimatedBudget) {
      fullDescription += `💰 Budget estimé: ${estimatedBudget} FCFA\n`
    }

    if (deadline) {
      fullDescription += `⏰ Délai souhaité: ${deadline}\n`
    }

    // Créer un ticket de type demande de devis
    const ticket = await Ticket.create({
      ticketNumber: generateTicketNumber(),
      clientId: userId,
      title,
      description: fullDescription,
      category: 'billing',
      priority: 'medium',
      status: 'open',
      messages: [{
        authorId: userId,
        authorName: client?.name || email,
        authorRole: 'CLIENT',
        message: fullDescription,
        createdAt: new Date(),
        isStaff: false
      }],
      metadata: {
        type: 'quote_request',
        quoteCategory: category,
        items: items || [],
        estimatedBudget: estimatedBudget || null,
        deadline: deadline || null,
        attachments: attachments || []
      },
      tags: ['devis', category],
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Notifier les admins en temps réel
    emitGroupNotification('admins', {
      type: 'info',
      title: 'Nouvelle Demande de Devis',
      message: `${client?.name || email} demande un devis : ${title}`,
      data: { ticketId: ticket._id.toString() }
    })

    return NextResponse.json({
      success: true,
      message: 'Demande de devis envoyée avec succès',
      ticket: {
        _id: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: ticket.status
      }
    })
  } catch (error) {
    console.error('Erreur création demande devis:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// GET - Récupérer les demandes de devis du client
export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await verifyToken(request)
    
    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    await connectMongoose()

    const requests = await Ticket.find({ 
      clientId: userId,
      category: 'billing',
      'metadata.type': 'quote_request'
    })
      .sort({ createdAt: -1 })
      .select('ticketNumber title status metadata createdAt')
      .lean()

    return NextResponse.json({
      success: true,
      requests: requests.map((r: any) => ({
        _id: r._id.toString(),
        ticketNumber: r.ticketNumber,
        title: r.title,
        status: r.status,
        category: r.metadata?.quoteCategory,
        estimatedBudget: r.metadata?.estimatedBudget,
        deadline: r.metadata?.deadline,
        items: r.metadata?.items || [],
        createdAt: r.createdAt
      }))
    })
  } catch (error) {
    console.error('Erreur récupération demandes devis:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}





