import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import { safeSearchRegex } from '@/lib/security-utils'
import Technician from '@/lib/models/Technician'
import { requireFullAdminAuth } from '@/lib/auth-roles'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    requireFullAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const status = (searchParams.get('status') || '').trim()
    const specialty = (searchParams.get('specialty') || '').trim()
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')

    const query: any = {}
    
    // Recherche textuelle (sécurisée contre ReDoS)
    if (q) {
      const searchRegex = safeSearchRegex(q)
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { technicianId: searchRegex },
      ]
    }
    
    // Filtres de statut
    if (status === 'active') query.isActive = true
    if (status === 'inactive') query.isActive = false
    if (status === 'available') query.isAvailable = true
    if (status === 'unavailable') query.isAvailable = false
    
    // Filtre par spécialité
    if (specialty && specialty !== 'all') {
      query.specialties = specialty
    }

    const [technicians, total] = await Promise.all([
      Technician.find(query)
        .select('-passwordHash -deviceTokens -locationHistory')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Technician.countDocuments(query)
    ])

    return NextResponse.json({ 
      success: true, 
      technicians, 
      total, 
      skip, 
      limit
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    requireFullAdminAuth(request)

    const body = await request.json()
    const { 
      name, 
      email, 
      phone, 
      password, 
      specialties, 
      certifications, 
      experience,
      workingHours 
    } = body

    // Validation
    if (!name || !email || !phone || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Les champs nom, email, téléphone et mot de passe sont obligatoires' 
      }, { status: 400 })
    }

    // Vérifier si l'email existe déjà
    const existingTech = await Technician.findOne({ email })
    if (existingTech) {
      return NextResponse.json({ 
        success: false, 
        error: 'Un technicien avec cet email existe déjà' 
      }, { status: 400 })
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10)

    // Générer un technicianId unique
    const count = await Technician.countDocuments()
    const technicianId = `TECH${String(count + 1).padStart(4, '0')}`

    // Créer le technicien
    const technician = await Technician.create({
      technicianId,
      name,
      email,
      phone,
      passwordHash,
      specialties: specialties || [],
      certifications: certifications || [],
      experience: experience || 0,
      isActive: true,
      isAvailable: true,
      permissions: {
        canCreateReports: true,
        canEditOwnReports: true,
        canDeleteDrafts: true,
        allowedInterventionTypes: ['maintenance', 'installation', 'urgence', 'autre']
      },
      stats: {
        totalReports: 0,
        averageRating: 0,
        completionRate: 0,
        averageResponseTime: 0,
        onTimeRate: 0
      },
      preferences: {
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        workingHours: workingHours || {
          start: '08:00',
          end: '18:00',
          weekends: false
        },
        language: 'fr'
      }
    })

    // Retourner sans les données sensibles
    const techData = technician.toObject()
    delete techData.passwordHash
    delete techData.deviceTokens

    return NextResponse.json({ 
      success: true, 
      technician: techData,
      message: 'Technicien créé avec succès'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la création'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message, success: false }, { status })
  }
}





