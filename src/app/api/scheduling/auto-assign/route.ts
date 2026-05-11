import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import Technician from '@/lib/models/Technician'
import { requireInterventionAccess } from '@/app/api/interventions/route'

interface ScoredTechnician {
  _id: mongoose.Types.ObjectId
  name: string
  specialties: string[]
  isAvailable: boolean
  stats: { averageRating: number; completionRate: number }
  currentLoad: number
  score: number
  reasons: string[]
}

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[_\s-]+/g, '')
}

function skillMatch(required: string[], technicianSkills: string[]): boolean {
  if (!required || required.length === 0) return true
  const techSet = new Set(technicianSkills.map(normalizeSkill))
  return required.every(s => techSet.has(normalizeSkill(s)))
}

function computeDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371 // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// POST — Affectation automatique d'une intervention
export async function POST(request: NextRequest) {
  try {
    const auth = await requireInterventionAccess(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await connectMongoose()
    const { interventionId, dryRun = true } = await request.json()

    if (!interventionId) {
      return NextResponse.json({ error: 'ID intervention requis' }, { status: 400 })
    }

    const intervention = await Intervention.findById(interventionId).lean() as any
    if (!intervention) {
      return NextResponse.json({ error: 'Intervention introuvable' }, { status: 404 })
    }

    const requiredSkills = (intervention.requiredSkills || []) as string[]
    const isUrgent = intervention.priority === 'urgent' || intervention.priority === 'critical'
    const isHigh = intervention.priority === 'high'

    // Récupérer tous les techniciens actifs
    const technicians = await Technician.find({ isActive: true }).lean() as any[]

    // Calculer la charge actuelle (interventions scheduled/in_progress sur 7j)
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    const activeInterventions = await Intervention.find({
      technicienId: { $in: technicians.map(t => t._id) },
      status: { $in: ['scheduled', 'in_progress'] },
      date: { $lte: weekFromNow }
    }).select('technicienId estimatedDuration').lean() as any[]

    const loadMap = new Map<string, number>()
    for (const ai of activeInterventions) {
      const tid = String(ai.technicienId)
      loadMap.set(tid, (loadMap.get(tid) || 0) + (ai.estimatedDuration || 2))
    }

    // Scoring
    const scored: ScoredTechnician[] = technicians
      .filter((tech: any) => {
        if (!tech.isAvailable) return false
        if (isUrgent && !tech.permissions?.allowedInterventionTypes?.includes('emergency')) return false
        return skillMatch(requiredSkills, tech.specialties || [])
      })
      .map((tech: any) => {
        const load = loadMap.get(String(tech._id)) || 0
        const reasons: string[] = []
        let score = 0

        // Rating (0-25 points)
        const rating = tech.stats?.averageRating || 3
        score += rating * 5
        reasons.push(`Note: ${rating.toFixed(1)}/5`)

        // Completion rate (0-15 points)
        const completion = tech.stats?.completionRate || 50
        score += (completion / 100) * 15
        reasons.push(`Complétion: ${completion}%`)

        // Load — moins chargé = meilleur (0-25 points)
        score += Math.max(0, 25 - load * 2)
        reasons.push(`Charge: ${load}h`)

        // Proximité géographique (0-25 points)
        if (intervention.gpsLocation?.lat && tech.currentLocation?.lat) {
          const dist = computeDistance(
            intervention.gpsLocation.lat, intervention.gpsLocation.lng,
            tech.currentLocation.lat, tech.currentLocation.lng
          )
          score += Math.max(0, 25 - dist)
          reasons.push(`Distance: ${dist.toFixed(1)}km`)
        }

        // Spécialité urgence (10 points)
        if (isUrgent && (tech.specialties || []).some((s: string) => s.toLowerCase().includes('urg'))) {
          score += 10
          reasons.push('Spécialité urgence')
        }

        return {
          _id: tech._id,
          name: tech.name,
          specialties: tech.specialties || [],
          isAvailable: tech.isAvailable,
          stats: tech.stats,
          currentLoad: load,
          score: Math.round(score * 10) / 10,
          reasons
        }
      })

    scored.sort((a, b) => b.score - a.score)

    if (scored.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Aucun technicien disponible avec les compétences requises',
        suggestions: ['Vérifier les compétences requises', 'Reporter l\'intervention', 'Former un technicien']
      })
    }

    const best = scored[0]

    // Application réelle si dryRun = false
    if (!dryRun) {
      await Intervention.updateOne(
        { _id: interventionId },
        {
          $set: {
            technicienId: best._id,
            assignedTechnician: best._id,
            status: 'scheduled'
          }
        }
      )
    }

    return NextResponse.json({
      success: true,
      dryRun,
      assignment: {
        interventionId,
        technicianId: String(best._id),
        technicianName: best.name,
        score: best.score,
        reasons: best.reasons
      },
      alternatives: scored.slice(1, 4).map(t => ({
        technicianId: String(t._id),
        technicianName: t.name,
        score: t.score
      }))
    })

  } catch (error: any) {
    console.error('Erreur affectation automatique:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// GET — Liste des suggestions d'affectation pour toutes les interventions en attente
export async function GET(request: NextRequest) {
  try {
    const auth = await requireInterventionAccess(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await connectMongoose()
    const pending = await Intervention.find({
      status: 'pending',
      technicienId: { $exists: false }
    }).limit(50).lean() as any[]

    const technicians = await Technician.find({ isActive: true }).lean() as any[]

    const results = pending.map(intervention => {
      const requiredSkills = (intervention.requiredSkills || []) as string[]
      const eligible = technicians.filter((tech: any) => {
        if (!tech.isAvailable) return false
        return skillMatch(requiredSkills, tech.specialties || [])
      })

      return {
        interventionId: String(intervention._id),
        title: intervention.title,
        priority: intervention.priority,
        requiredSkills,
        eligibleCount: eligible.length,
        topMatch: eligible.length > 0 ? {
          name: eligible[0].name,
          id: String(eligible[0]._id),
          specialties: eligible[0].specialties
        } : null
      }
    })

    return NextResponse.json({ success: true, count: results.length, interventions: results })
  } catch (error: any) {
    console.error('Erreur liste affectations:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
