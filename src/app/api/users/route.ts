import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import User from '@/lib/models/User'
import { connectMongoose } from '@/lib/mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const body = await request.json()
    const { username, email, password, name, phone, role } = body

    // Validation
    if (!username || !email || !password || !name) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [
        { username },
        { email: email.toLowerCase() }
      ]
    }).lean()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur ou email déjà utilisé' },
        { status: 409 }
      )
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Créer l'utilisateur
    const created = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      name,
      phone,
      role: (role || 'CLIENT')
    })

    const user = {
      id: String(created._id),
      username: created.username,
      email: created.email,
      name: created.name,
      phone: created.phone,
      role: created.role,
      createdAt: created.createdAt
    }

    return NextResponse.json({
      success: true,
      user
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur création utilisateur:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}