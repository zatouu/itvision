import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'

interface Technician {
  id: string
  name: string
  email: string
  phone: string
  skills: string[]
  zone: string
  availability: {
    [date: string]: {
      morning: boolean
      afternoon: boolean
      evening: boolean
    }
  }
  currentLoad: number
  rating: number
  specialties: string[]
}

// GET - Récupérer tous les techniciens
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    
    const { searchParams } = new URL(request.url)
    const zone = searchParams.get('zone')
    const skills = searchParams.get('skills')?.split(',')
    const available = searchParams.get('available') === 'true'

    // Données de démonstration (à remplacer par requête MongoDB)
    const mockTechnicians: Technician[] = [
      {
        id: 'tech-001',
        name: 'Moussa Diop',
        email: 'moussa@itvision.sn',
        phone: '+221 77 123 45 67',
        skills: ['videosurveillance', 'network_cabling', 'fiber_optic'],
        zone: 'Dakar-Centre',
        availability: {
          '2024-01-15': { morning: true, afternoon: true, evening: false },
          '2024-01-16': { morning: true, afternoon: false, evening: false },
          '2024-01-17': { morning: false, afternoon: true, evening: true }
        },
        currentLoad: 65,
        rating: 4.8,
        specialties: ['Installation', 'Maintenance', 'Dépannage']
      },
      {
        id: 'tech-002',
        name: 'Fatou Sall',
        email: 'fatou@itvision.sn',
        phone: '+221 77 234 56 78',
        skills: ['controle_acces', 'domotique', 'securite_incendie'],
        zone: 'Almadies',
        availability: {
          '2024-01-15': { morning: true, afternoon: true, evening: true },
          '2024-01-16': { morning: true, afternoon: true, evening: false },
          '2024-01-17': { morning: true, afternoon: true, evening: true }
        },
        currentLoad: 40,
        rating: 4.9,
        specialties: ['Configuration', 'Formation', 'Support']
      },
      {
        id: 'tech-003',
        name: 'Amadou Ba',
        email: 'amadou@itvision.sn',
        phone: '+221 77 345 67 89',
        skills: ['videosurveillance', 'controle_acces', 'maintenance'],
        zone: 'Pikine',
        availability: {
          '2024-01-15': { morning: false, afternoon: true, evening: true },
          '2024-01-16': { morning: true, afternoon: true, evening: true },
          '2024-01-17': { morning: true, afternoon: false, evening: true }
        },
        currentLoad: 80,
        rating: 4.7,
        specialties: ['Réparation', 'Diagnostic', 'Urgences']
      }
    ]

    let filteredTechnicians = mockTechnicians

    // Appliquer les filtres
    if (zone && zone !== 'all') {
      filteredTechnicians = filteredTechnicians.filter(t => t.zone === zone)
    }
    
    if (skills && skills.length > 0) {
      filteredTechnicians = filteredTechnicians.filter(t => 
        skills.every(skill => t.skills.includes(skill))
      )
    }
    
    if (available) {
      filteredTechnicians = filteredTechnicians.filter(t => t.currentLoad < 90)
    }

    return NextResponse.json({
      success: true,
      technicians: filteredTechnicians,
      total: filteredTechnicians.length
    })

  } catch (error) {
    console.error('Erreur API techniciens:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST - Ajouter un nouveau technicien
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    
    const body = await request.json()
    
    // Validation
    if (!body.name || !body.email || !body.skills || !body.zone) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      )
    }

    const newTechnician: Technician = {
      id: `tech-${Date.now()}`,
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      skills: body.skills,
      zone: body.zone,
      availability: body.availability || {},
      currentLoad: 0,
      rating: 5.0,
      specialties: body.specialties || []
    }

    return NextResponse.json({
      success: true,
      technician: newTechnician
    })

  } catch (error) {
    console.error('Erreur création technicien:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
