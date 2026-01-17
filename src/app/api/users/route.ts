import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import User from '@/lib/models/User'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'

// Vérifier si l'utilisateur est admin (pour pouvoir attribuer des rôles)
async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const { role, userId } = await requireAuth(request)
    return { isAdmin: role === 'ADMIN', userId }
  } catch {
    return { isAdmin: false }
  }
}

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

    // SÉCURITÉ: Seuls les admins peuvent créer des utilisateurs avec un rôle autre que CLIENT
    const { isAdmin } = await verifyAdmin(request)
    const allowedRoles = ['CLIENT', 'TECHNICIAN', 'ADMIN', 'PRODUCT_MANAGER']
    let finalRole = 'CLIENT' // Par défaut, toujours CLIENT
    
    if (role && role !== 'CLIENT') {
      if (!isAdmin) {
        // Si non-admin tente de créer un compte avec un rôle privilégié, refuser
        return NextResponse.json(
          { error: 'Seuls les administrateurs peuvent attribuer des rôles privilégiés' },
          { status: 403 }
        )
      }
      // Admin peut attribuer n'importe quel rôle valide
      finalRole = allowedRoles.includes(String(role).toUpperCase()) ? String(role).toUpperCase() : 'CLIENT'
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
      role: finalRole
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