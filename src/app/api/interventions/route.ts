import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'

// Modèle temporaire pour les interventions (à remplacer par Mongoose)
interface Intervention {
  id: string
  title: string
  description: string
  client: {
    name: string
    address: string
    phone: string
    zone: string
  }
  service: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedDuration: number
  requiredSkills: string[]
  scheduledDate?: string
  scheduledTime?: string
  assignedTechnician?: string
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: string
  urgency: boolean
}

// GET - Récupérer toutes les interventions
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const service = searchParams.get('service')
    const zone = searchParams.get('zone')

    // Données de démonstration (à remplacer par requête MongoDB)
    const mockInterventions: Intervention[] = [
      {
        id: 'int-001',
        title: 'Installation système vidéosurveillance',
        description: 'Installation complète 8 caméras IP + NVR',
        client: {
          name: 'SARL TechnoPlus',
          address: 'Rue 10, Mermoz, Dakar',
          phone: '+221 33 123 45 67',
          zone: 'Dakar-Centre'
        },
        service: 'videosurveillance',
        priority: 'high',
        estimatedDuration: 6,
        requiredSkills: ['videosurveillance', 'network_cabling'],
        status: 'pending',
        createdAt: '2024-01-14T10:00:00Z',
        urgency: false
      },
      {
        id: 'int-002',
        title: 'Maintenance préventive système accès',
        description: 'Vérification et mise à jour lecteurs RFID',
        client: {
          name: 'Résidence Les Palmiers',
          address: 'VDN, Almadies, Dakar',
          phone: '+221 77 987 65 43',
          zone: 'Almadies'
        },
        service: 'controle_acces',
        priority: 'medium',
        estimatedDuration: 3,
        requiredSkills: ['controle_acces'],
        status: 'pending',
        createdAt: '2024-01-14T14:30:00Z',
        urgency: false
      },
      {
        id: 'int-003',
        title: 'Dépannage urgent caméra défaillante',
        description: 'Caméra principale entrée ne fonctionne plus',
        client: {
          name: 'Banque Atlantique',
          address: 'Avenue Cheikh Anta Diop, Dakar',
          phone: '+221 33 456 78 90',
          zone: 'Dakar-Centre'
        },
        service: 'videosurveillance',
        priority: 'urgent',
        estimatedDuration: 2,
        requiredSkills: ['videosurveillance'],
        status: 'pending',
        createdAt: '2024-01-15T08:15:00Z',
        urgency: true
      }
    ]

    let filteredInterventions = mockInterventions

    // Appliquer les filtres
    if (date) {
      filteredInterventions = filteredInterventions.filter(i => i.scheduledDate === date)
    }
    if (status) {
      filteredInterventions = filteredInterventions.filter(i => i.status === status)
    }
    if (service && service !== 'all') {
      filteredInterventions = filteredInterventions.filter(i => i.service === service)
    }
    if (zone && zone !== 'all') {
      filteredInterventions = filteredInterventions.filter(i => i.client.zone === zone)
    }

    return NextResponse.json({
      success: true,
      interventions: filteredInterventions,
      total: filteredInterventions.length
    })

  } catch (error) {
    console.error('Erreur API interventions:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle intervention
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    
    const body = await request.json()
    
    // Validation des données
    if (!body.title || !body.client || !body.service) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      )
    }

    // Créer l'intervention (à implémenter avec MongoDB)
    const newIntervention: Intervention = {
      id: `int-${Date.now()}`,
      title: body.title,
      description: body.description || '',
      client: body.client,
      service: body.service,
      priority: body.priority || 'medium',
      estimatedDuration: body.estimatedDuration || 2,
      requiredSkills: body.requiredSkills || [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      urgency: body.urgency || false
    }

    return NextResponse.json({
      success: true,
      intervention: newIntervention
    })

  } catch (error) {
    console.error('Erreur création intervention:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour une intervention (affectation)
export async function PUT(request: NextRequest) {
  try {
    await connectMongoose()
    
    const body = await request.json()
    const { interventionId, technicianId, scheduledDate, scheduledTime } = body

    if (!interventionId) {
      return NextResponse.json(
        { error: 'ID intervention requis' },
        { status: 400 }
      )
    }

    // Mettre à jour l'intervention (à implémenter avec MongoDB)
    const updatedIntervention = {
      id: interventionId,
      assignedTechnician: technicianId,
      scheduledDate,
      scheduledTime,
      status: technicianId ? 'scheduled' : 'pending'
    }

    return NextResponse.json({
      success: true,
      intervention: updatedIntervention
    })

  } catch (error) {
    console.error('Erreur mise à jour intervention:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
