import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '@/lib/models/User'
import { connectMongoose } from '@/lib/mongoose'
import { logLoginAttempt } from '@/lib/security-logger'
import { applyRateLimit, authRateLimiter } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { email, password, userType, remember } = await request.json()

    // Rate limit tentatives de login
    const limited = applyRateLimit(request, authRateLimiter)
    if (limited) return limited

    if (!email || !password) {
      logLoginAttempt(false, request, undefined, { reason: 'missing_credentials' })
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    // Recherche de l'utilisateur dans la base de données
    const user = (await User.findOne({ email: email.toLowerCase() }).lean()) as any
    
    if (!user) {
      logLoginAttempt(false, request, undefined, { reason: 'user_not_found', email })
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 401 }
      )
    }

    // Vérification verrouillage
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return NextResponse.json(
        { error: `Compte verrouillé. Réessayez plus tard.` },
        { status: 423 }
      )
    }

    // Vérification du mot de passe avec bcrypt
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      logLoginAttempt(false, request, user.id, { reason: 'invalid_password' })
      // Incrémenter tentatives et verrouiller si nécessaire
      const nextAttempts = (user.loginAttempts || 0) + 1
      const update: any = { loginAttempts: nextAttempts }
      if (nextAttempts >= 5) {
        update.lockedUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        update.loginAttempts = 0
      }
      await User.updateOne({ _id: user._id }, { $set: update })
      return NextResponse.json(
        { error: 'Mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Si un userType est spécifié, vérifier la correspondance
    if (userType && user.role.toLowerCase() !== userType.toLowerCase()) {
      logLoginAttempt(false, request, user.id, { reason: 'role_mismatch', expectedRole: userType, actualRole: user.role })
      return NextResponse.json(
        { error: `Ce compte n'est pas un compte ${userType}` },
        { status: 403 }
      )
    }

    // 2FA: si activé, générer code et demander vérification
    if (user.twoFactorEnabled) {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 min
      await User.updateOne({ _id: user._id }, { $set: { twoFactorCode: code, twoFactorExpires: expires } })
      console.log(`[2FA] Code pour ${user.email}: ${code} (expire ${expires.toISOString()})`)
      return NextResponse.json({ mfa_required: true, userId: String(user._id) })
    }

    // Génération du token JWT
    const token = jwt.sign(
      { 
        userId: String(user._id),
        email: user.email,
        role: user.role,
        username: user.username
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: remember ? '30d' : '7d' }
    )

    // Log de connexion réussie
    logLoginAttempt(true, request, user.id, { role: user.role })

    // Données utilisateur à retourner (sans mot de passe)
    const userData = {
      id: String(user._id),
      email: user.email,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role
    }

    // Réinitialiser tentatives en cas de succès
    await User.updateOne({ _id: user._id }, { $set: { loginAttempts: 0 }, $unset: { lockedUntil: 1 } })

    // Définir le cookie de session
    const response = NextResponse.json({
      success: true,
      user: userData,
      redirectUrl: getRedirectUrl(user.role)
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: (remember ? 30 : 7) * 24 * 60 * 60
    })

    return response

  } catch (error) {
    console.error('Erreur de connexion:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// Fonction pour déterminer l'URL de redirection selon le rôle
function getRedirectUrl(role: string): string {
  const normalized = String(role).toUpperCase()
  switch (normalized) {
    case 'PRODUCT_MANAGER':
      return '/admin/produits'
    case 'ADMIN':
      return '/admin'
    case 'TECHNICIAN':
      return '/tech-interface'
    case 'CLIENT':
    default:
      return '/client-portal'
  }
}

// API pour vérifier le token et obtenir les infos utilisateur
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    
    return NextResponse.json({
      user: {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Token invalide' },
      { status: 401 }
    )
  }
}