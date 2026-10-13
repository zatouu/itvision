import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import { disconnectWebSessions } from '@/lib/auth-session'

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

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { token, password } = await request.json()
    
    if (typeof token !== 'string' || !token || typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Token et mot de passe requis' }, { status: 400 })
    }

    // Validation du mot de passe
    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    // Rechercher l'utilisateur avec le token valide
    const user = await User.findOne({ 
      passwordResetToken: token, 
      passwordResetExpires: { $gt: new Date() } 
    })
    
    if (!user) {
      console.log('[RESET] Token invalide ou expiré')
      return NextResponse.json({ error: 'Lien de réinitialisation invalide ou expiré' }, { status: 400 })
    }

    // Hasher le nouveau mot de passe
    const passwordHash = await bcrypt.hash(password, 12)
    
    // Mettre à jour le mot de passe et supprimer le token
    const result = await User.updateOne({ _id: user._id, passwordResetToken: token, passwordResetExpires: { $gt: new Date() } }, {
      $inc: { sessionVersion: 1 },
      $set: { 
        passwordHash,
        forcePasswordReset: false,
        // Réinitialiser les tentatives de connexion en cas de succès
        loginAttempts: 0
      },
      $unset: { 
        passwordResetToken: 1, 
        passwordResetExpires: 1,
        twoFactorCode: 1,
        twoFactorExpires: 1,
        companyInvitePending: 1,
        lockedUntil: 1 // Débloquer le compte si il était verrouillé
      }
    })

    if (result.matchedCount !== 1) return NextResponse.json({ error: 'Lien de réinitialisation invalide ou expiré' }, { status: 400 })
    disconnectWebSessions(String(user._id))

    console.log(`[RESET] Mot de passe réinitialisé avec succès pour: ${user.email}`)

    return NextResponse.json({ 
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    })
  } catch (error) {
    console.error('[RESET] Erreur serveur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
