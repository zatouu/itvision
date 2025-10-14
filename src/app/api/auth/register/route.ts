import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import emailService from '@/lib/email-service'
import { applyRateLimit, authRateLimiter } from '@/lib/rate-limiter'

function validatePassword(password: string): string | null {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  if (password.length < minLength) {
    return 'Le mot de passe doit contenir au moins 8 caractères'
  }
  if (!hasUpperCase) {
    return 'Le mot de passe doit contenir au moins une majuscule'
  }
  if (!hasLowerCase) {
    return 'Le mot de passe doit contenir au moins une minuscule'
  }
  if (!hasNumbers) {
    return 'Le mot de passe doit contenir au moins un chiffre'
  }
  if (!hasSpecialChar) {
    return 'Le mot de passe doit contenir au moins un caractère spécial'
  }
  return null
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function generateUsername(email: string, name: string): string {
  // Générer un nom d'utilisateur basé sur l'email et le nom
  const emailPart = email.split('@')[0]
  const namePart = name.toLowerCase().replace(/\s+/g, '.')
  const randomSuffix = Math.floor(Math.random() * 1000)
  
  return `${namePart}.${randomSuffix}`.substring(0, 20)
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()

    // Rate limiting pour les inscriptions
    const limited = applyRateLimit(request, authRateLimiter)
    if (limited) return limited

    const { email, password, name, phone, role = 'CLIENT' } = await request.json()

    // Validation des champs requis
    if (!email || !password || !name) {
      return NextResponse.json({ 
        error: 'Email, mot de passe et nom sont requis' 
      }, { status: 400 })
    }

    // Validation de l'email
    if (!validateEmail(email)) {
      return NextResponse.json({ 
        error: 'Format d\'email invalide' 
      }, { status: 400 })
    }

    // Validation du mot de passe
    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    // Validation du rôle
    const validRoles = ['CLIENT', 'TECHNICIAN', 'ADMIN']
    if (!validRoles.includes(role.toUpperCase())) {
      return NextResponse.json({ 
        error: 'Rôle invalide' 
      }, { status: 400 })
    }

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json({ 
        error: 'Un compte existe déjà avec cette adresse email' 
      }, { status: 409 })
    }

    // Générer un nom d'utilisateur unique
    let username = generateUsername(email, name)
    let usernameExists = await User.findOne({ username })
    let counter = 1
    
    while (usernameExists) {
      username = `${generateUsername(email, name)}.${counter}`
      usernameExists = await User.findOne({ username })
      counter++
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 12)

    // Créer l'utilisateur
    const newUser = new User({
      username,
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
      phone: phone?.trim() || undefined,
      role: role.toUpperCase(),
      isActive: true,
      loginAttempts: 0
    })

    await newUser.save()

    console.log(`[REGISTER] Nouvel utilisateur créé: ${email} (${role})`)

    // Envoyer l'email de bienvenue
    try {
      const emailData = emailService.generateWelcomeEmail(email, name)
      await emailService.sendEmail(emailData)
      console.log(`[REGISTER] Email de bienvenue envoyé à: ${email}`)
    } catch (emailError) {
      console.error('[REGISTER] Erreur lors de l\'envoi d\'email de bienvenue:', emailError)
      // Ne pas faire échouer l'inscription si l'email ne peut pas être envoyé
    }

    // Retourner les données utilisateur (sans le mot de passe)
    const userData = {
      id: String(newUser._id),
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      phone: newUser.phone,
      role: newUser.role,
      createdAt: newUser.createdAt
    }

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      user: userData
    }, { status: 201 })

  } catch (error) {
    console.error('[REGISTER] Erreur serveur:', error)
    
    // Gérer les erreurs de validation MongoDB
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ 
        error: 'Un compte existe déjà avec ces informations' 
      }, { status: 409 })
    }

    return NextResponse.json({ 
      error: 'Erreur serveur lors de la création du compte' 
    }, { status: 500 })
  }
}

// API pour vérifier la disponibilité d'un email
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ 
        available: false, 
        error: 'Format d\'email invalide' 
      })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    
    return NextResponse.json({
      available: !existingUser,
      message: existingUser ? 'Email déjà utilisé' : 'Email disponible'
    })

  } catch (error) {
    console.error('[REGISTER] Erreur lors de la vérification d\'email:', error)
    return NextResponse.json({ 
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
}