import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import bcrypt from 'bcryptjs'
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

export async function GET(request: NextRequest) {
  try {
    const { userId } = await verifyToken(request)
    await connectMongoose()

    // Chercher dans User puis dans Client
    let profile: any = await User.findById(userId).select('-passwordHash').lean()
    
    if (!profile) {
      profile = await Client.findById(userId).lean()
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const profileData = profile as any
    
    return NextResponse.json({
      success: true,
      profile: {
        _id: profileData._id.toString(),
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        company: profileData.company,
        address: profileData.address,
        role: profileData.role,
        avatar: profileData.avatar || profileData.avatarUrl,
        preferences: profileData.preferences || {},
        createdAt: profileData.createdAt
      }
    })
  } catch (error) {
    console.error('Erreur récupération profil:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await verifyToken(request)
    await connectMongoose()

    const body = await request.json()
    const { name, phone, company, address, currentPassword, newPassword, preferences } = body

    // Chercher le profil
    let profile: any = await User.findById(userId)
    let isClient = false
    
    if (!profile) {
      profile = await Client.findById(userId)
      isClient = true
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    // Mise à jour des champs
    if (name) profile.name = name
    if (phone) profile.phone = phone
    if (company) profile.company = company
    if (address) profile.address = address
    if (preferences) profile.preferences = { ...profile.preferences, ...preferences }

    // Changement de mot de passe
    if (currentPassword && newPassword) {
      const passwordHash: string | undefined = profile.passwordHash
      if (!passwordHash) {
        return NextResponse.json({ error: 'Mot de passe non configuré' }, { status: 400 })
      }

      const isValidPassword = await bcrypt.compare(currentPassword, passwordHash)
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 })
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' }, { status: 400 })
      }

      profile.passwordHash = await bcrypt.hash(newPassword, 10)
    }

    await profile.save()

    const profileData = profile as any
    
    return NextResponse.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      profile: {
        _id: profileData._id.toString(),
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        company: profileData.company,
        address: profileData.address,
        preferences: profileData.preferences
      }
    })
  } catch (error) {
    console.error('Erreur mise à jour profil:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

