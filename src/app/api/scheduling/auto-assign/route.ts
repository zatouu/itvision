import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'

interface Technician {
  id: string
  name: string
  skills: string[]
  zone: string
  currentLoad: number
  rating: number
  specialties: string[]
}

interface ScoredTechnician extends Technician {
  score: number
}

interface Intervention {
  id: string
  client: { zone: string }
  service: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedDuration: number
  requiredSkills: string[]
  urgency: boolean
}

// POST - Affectation automatique d'une intervention
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    
    const { interventionId } = await request.json()

    if (!interventionId) {
      return NextResponse.json(
        { error: 'ID intervention requis' },
        { status: 400 }
      )
    }

    // Récupérer l'intervention (données de démo)
    const mockInterventions: Intervention[] = [
      {
        id: 'int-001',
        client: { zone: 'Dakar-Centre' },
        service: 'videosurveillance',
        priority: 'high',
        estimatedDuration: 6,
        requiredSkills: ['videosurveillance', 'network_cabling'],
        urgency: false
      }
    ]

    const intervention = mockInterventions.find(i => i.id === interventionId)
    if (!intervention) {
      return NextResponse.json(
        { error: 'Intervention non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer les techniciens (données de démo)
    const mockTechnicians: Technician[] = [
      {
        id: 'tech-001',
        name: 'Moussa Diop',
        skills: ['videosurveillance', 'network_cabling', 'fiber_optic'],
        zone: 'Dakar-Centre',
        currentLoad: 65,
        rating: 4.8,
        specialties: ['Installation', 'Maintenance', 'Dépannage']
      },
      {
        id: 'tech-002',
        name: 'Fatou Sall',
        skills: ['controle_acces', 'domotique', 'securite_incendie'],
        zone: 'Almadies',
        currentLoad: 40,
        rating: 4.9,
        specialties: ['Configuration', 'Formation', 'Support']
      },
      {
        id: 'tech-003',
        name: 'Amadou Ba',
        skills: ['videosurveillance', 'controle_acces', 'maintenance'],
        zone: 'Pikine',
        currentLoad: 80,
        rating: 4.7,
        specialties: ['Réparation', 'Diagnostic', 'Urgences']
      }
    ]

    // Algorithme d'affectation intelligente
    const findBestTechnician = (intervention: Intervention, technicians: Technician[]): ScoredTechnician | null => {
      // Filtrer les techniciens disponibles
      const availableTechnicians = technicians.filter(tech => {
        // Vérifier les compétences requises
        const hasRequiredSkills = intervention.requiredSkills.every(skill => 
          tech.skills.includes(skill)
        )
        
        // Vérifier la charge de travail (ne pas dépasser 90%)
        const notOverloaded = tech.currentLoad < 90
        
        return hasRequiredSkills && notOverloaded
      })

      if (availableTechnicians.length === 0) return null

      // Scoring pour choisir le meilleur technicien
      const scoredTechnicians = availableTechnicians.map(tech => {
        let score = 0
        
        // Bonus pour la même zone (30 points)
        if (tech.zone === intervention.client.zone) score += 30
        
        // Bonus pour charge de travail faible (0-30 points)
        score += (100 - tech.currentLoad) * 0.3
        
        // Bonus pour rating élevé (0-50 points)
        score += tech.rating * 10
        
        // Bonus pour urgence si spécialité "Urgences" (25 points)
        if (intervention.urgency && tech.specialties.includes('Urgences')) score += 25
        
        // Bonus pour priorité élevée si spécialité "Dépannage" (15 points)
        if (intervention.priority === 'high' && tech.specialties.includes('Dépannage')) score += 15
        
        return { ...tech, score }
      })

      // Retourner le technicien avec le meilleur score
      return scoredTechnicians.sort((a, b) => b.score - a.score)[0]
    }

    const bestTechnician = findBestTechnician(intervention, mockTechnicians)

    if (!bestTechnician) {
      return NextResponse.json({
        success: false,
        message: 'Aucun technicien disponible avec les compétences requises',
        suggestions: [
          'Vérifier les compétences requises',
          'Reporter l\'intervention',
          'Former un technicien sur ces compétences'
        ]
      })
    }

    // Calculer le créneau optimal
    const suggestedTime = intervention.urgency ? '08:00' : '09:00'
    const suggestedDate = new Date().toISOString().split('T')[0]

    return NextResponse.json({
      success: true,
      assignment: {
        interventionId,
        technicianId: bestTechnician.id,
        technicianName: bestTechnician.name,
        suggestedDate,
        suggestedTime,
        score: bestTechnician.score,
        reasons: [
          bestTechnician.zone === intervention.client.zone ? 'Même zone géographique' : 'Zone différente',
          `Charge de travail: ${bestTechnician.currentLoad}%`,
          `Note: ${bestTechnician.rating}/5`,
          `Compétences: ${intervention.requiredSkills.join(', ')}`
        ]
      }
    })

  } catch (error) {
    console.error('Erreur affectation automatique:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
