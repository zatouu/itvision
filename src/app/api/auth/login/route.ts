import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import User from '@/lib/models/User'
import Technician from '@/lib/models/Technician'
import { connectMongoose } from '@/lib/mongoose'
import { logLoginAttempt } from '@/lib/security-logger'
import { applyRateLimit, authRateLimiter } from '@/lib/rate-limiter'
import { signAuthTokenWithExpiry, verifyJwtPayload } from '@/lib/jwt'
import { resolveUserCategory } from '@/lib/user-segmentation'

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
    let user = (await User.findOne({ email: email.toLowerCase() }).lean()) as any
    
    // Si pas trouvé dans User, chercher dans Technician et créer le User manquant
    if (!user) {
      const tech = await Technician.findOne({ email: email.toLowerCase() }).lean() as any
      if (tech && tech.passwordHash) {
        const techPasswordValid = await bcrypt.compare(password, tech.passwordHash)
        if (techPasswordValid) {
          // Créer le User manquant à partir du Technician
          const username = email.toLowerCase().split('@')[0] + '_tech_' + Date.now().toString(36)
          const created = await User.create({
            username,
            email: email.toLowerCase(),
            passwordHash: tech.passwordHash,
            name: tech.name || email.split('@')[0],
            phone: tech.phone || '',
            role: 'TECHNICIAN',
            isActive: true
          })
          user = await User.findById(created._id).lean() as any
        }
      }
      if (!user) {
        logLoginAttempt(false, request, undefined, { reason: 'user_not_found', email })
        return NextResponse.json(
          { error: 'Utilisateur non trouvé' },
          { status: 401 }
        )
      }
    }

    // Vérification verrouillage
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return NextResponse.json(
        { error: `Compte verrouillé. Réessayez plus tard.` },
        { status: 423 }
      )
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'Compte désactivé. Contactez un administrateur.' },
        { status: 403 }
      )
    }

    // Vérification du mot de passe avec bcrypt
    let isValidPassword = await bcrypt.compare(password, user.passwordHash)

    // Fallback: si le mot de passe échoue dans User, vérifier dans Technician
    // (les hash peuvent différer si créés par deux routes séparées)
    if (!isValidPassword && String(user.role).toUpperCase() === 'TECHNICIAN') {
      const tech = await Technician.findOne({ email: email.toLowerCase() }).lean() as any
      if (tech?.passwordHash) {
        const techPasswordValid = await bcrypt.compare(password, tech.passwordHash)
        if (techPasswordValid) {
          // Synchroniser le hash du Technician vers le User
          await User.updateOne({ _id: user._id }, { $set: { passwordHash: tech.passwordHash, loginAttempts: 0 } })
          isValidPassword = true
        }
      }
    }

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
      return NextResponse.json({ mfa_required: true, userId: String(user._id) })
    }

    // Génération du token JWT (rôle normalisé en majuscules)
    const normalizedRole = String(user.role || '').toUpperCase()
    const companyClientId = user.companyClientId ? String(user.companyClientId) : undefined
    const userCategory = resolveUserCategory({ role: normalizedRole, companyClientId })
    const token = await signAuthTokenWithExpiry(
      {
        userId: String(user._id),
        email: user.email,
        role: normalizedRole,
        username: user.username,
        marketplaceTier: user.marketplaceTier || 'standard',
        userCategory,
        ...(companyClientId ? { companyClientId } : {})
      },
      remember ? '30d' : '7d'
    )

    // Log de connexion réussie
    logLoginAttempt(true, request, user.id, { role: user.role })

    // Données utilisateur à retourner (sans mot de passe)
    const isEnterpriseClient = normalizedRole === 'CLIENT' && !!companyClientId
    const userData = {
      id: String(user._id),
      email: user.email,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
      marketplaceTier: user.marketplaceTier || 'standard',
      companyClientId: companyClientId || undefined,
      clientType: isEnterpriseClient ? 'enterprise' : 'marketplace',
      userCategory
    }

    // Réinitialiser tentatives en cas de succès
    await User.updateOne({ _id: user._id }, { $set: { loginAttempts: 0 }, $unset: { lockedUntil: 1 } })

    // Définir le cookie de session
    const response = NextResponse.json({
      success: true,
      user: userData,
      redirectUrl: getRedirectUrl(user.role, companyClientId)
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
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
function getRedirectUrl(role: string, companyClientId?: string): string {
  const normalized = String(role).toUpperCase()
  switch (normalized) {
    case 'PRODUCT_MANAGER':
      return '/admin/produits'
    case 'ADMIN':
      return '/admin'
    case 'TECHNICIAN':
      return '/tech-interface'
    case 'CLIENT':
      return companyClientId ? '/portail-entreprise' : '/compte'
    default:
      return '/compte'
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

    const decoded = await verifyJwtPayload(token)
    
    // Enrichir avec les données utilisateur depuis la DB si possible
    let name: string | undefined
    let username: string | undefined
    let dbUser: any = null
    try {
      await connectMongoose()
      const userId = String(decoded.userId || decoded.id || decoded.sub || '')
      if (userId) {
        const user = await User.findById(userId).select('name username marketplaceTier marketplaceOrderCount totalMarketplacePurchases proRequestedAt proValidatedAt').lean() as any
        if (user) {
          name = user.name
          username = user.username
          dbUser = user
        }
      }
    } catch {}

    const companyClientId = (decoded as any).companyClientId || undefined
    const clientType = companyClientId ? 'enterprise' : 'marketplace'

    return NextResponse.json({
      user: {
        id: String(decoded.userId || decoded.id || decoded.sub || ''),
        email: typeof decoded.email === 'string' ? decoded.email : undefined,
        name: name || (decoded as any).name || (decoded as any).username,
        username: username || (decoded as any).username,
        role: String(decoded.role || ''),
        permissions: (decoded as any).permissions,
        marketplaceTier: dbUser?.marketplaceTier || (decoded as any).marketplaceTier || 'standard',
        marketplaceOrderCount: dbUser?.marketplaceOrderCount ?? 0,
        totalMarketplacePurchases: dbUser?.totalMarketplacePurchases ?? 0,
        proRequestedAt: dbUser?.proRequestedAt || null,
        proValidatedAt: dbUser?.proValidatedAt || null,
        companyClientId,
        clientType
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Token invalide' },
      { status: 401 }
    )
  }
}