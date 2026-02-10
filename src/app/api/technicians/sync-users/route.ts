import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Technician from '@/lib/models/Technician'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'

// POST - Synchroniser les techniciens existants vers la collection User
// Nécessaire car les techniciens créés avant le fix n'ont pas de User associé
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()

    // Vérifier que c'est un admin
    const { role } = await requireAuth(request)
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer tous les techniciens
    const technicians = await Technician.find({}).lean() as any[]
    
    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const tech of technicians) {
      try {
        const existingUser = await User.findOne({ email: tech.email }).lean()
        if (existingUser) {
          skipped++
          continue
        }

        // Créer le User manquant
        const username = tech.email.split('@')[0] + '_tech_' + Date.now().toString(36)
        await User.create({
          username,
          email: tech.email,
          passwordHash: tech.passwordHash,
          name: tech.name,
          phone: tech.phone || '',
          role: 'TECHNICIAN',
          isActive: tech.isActive !== false
        })
        created++
      } catch (err: any) {
        errors.push(`${tech.email}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      total: technicians.length,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Erreur sync techniciens:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    )
  }
}
