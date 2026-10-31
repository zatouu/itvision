import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import { Order } from '@/lib/models/Order' // Import Order
import bcrypt from 'bcryptjs'
import { verifyAuthServer, clearAuthCookie } from '@/lib/auth-server'
import { z } from 'zod'
import { isPhoneLike } from '@/lib/sms'
import { findRegionByDepartment } from '@/lib/senegal-address' // Import helper
import { keycloakEnabled } from '@/lib/keycloak'
import { disconnectWebSessions } from '@/lib/auth-session'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthServer(request)
    if (auth.unavailable) return NextResponse.json({ error: 'La vérification de session est temporairement indisponible.' }, { status: 503 })
    if (!auth.isAuthenticated || !auth.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const userId = auth.user.id
    await connectMongoose()

    // Le JWT market n'est émis que pour des comptes User — pas de fallback Client.
    const profile: any = await User.findById(userId).select('-passwordHash').lean()

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const profileData = profile as any

    // Self-healing: si le nom est en fait un numéro de téléphone (ancien bug), on le vide
    let profileName = profileData.name || ''
    if (profileName && isPhoneLike(profileName)) {
      profileName = ''
    }

    // Récupérer la dernière commande pour l'adresse
    let lastAddress = null
    try {
        const lastOrder = await Order.findOne({ clientId: userId })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean() as any // Type assertion needed for lean Order
        
        if (lastOrder && lastOrder.address) {
            // Reconstruire l'adresse structurée
            const department = lastOrder.address.postalCode 
            const region = findRegionByDepartment(department || '') || lastOrder.address.city
            
            lastAddress = {
                street: lastOrder.address.street || '',
                department: department || '',
                neighborhood: lastOrder.address.city || '', // On a stocké le quartier dans city
                region: region || '',
                additionalInfo: lastOrder.address.notes || ''
            }
        }
    } catch (e) {
        console.error('Erreur récupération dernière commande:', e)
    }
    
    return NextResponse.json({
      success: true,
      lastAddress,
      profile: {
        _id: profileData._id.toString(),
        name: profileName,
        email: profileData.email,
        phone: profileData.phone,
        company: profileData.company,
        address: profileData.address,
        companyClientId: profileData.companyClientId,
        role: profileData.role,
        avatar: profileData.avatar || profileData.avatarUrl,
        preferences: profileData.preferences || {},
        createdAt: profileData.createdAt,
        marketplaceTier: profileData.marketplaceTier || 'standard',
        totalMarketplacePurchases: profileData.totalMarketplacePurchases || 0,
        marketplaceOrderCount: profileData.marketplaceOrderCount || 0,
        proRequestedAt: profileData.proRequestedAt || null,
        proValidatedAt: profileData.proValidatedAt || null
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
    const auth = await verifyAuthServer(request)
    if (auth.unavailable) return NextResponse.json({ error: 'La vérification de session est temporairement indisponible.' }, { status: 503 })
    if (!auth.isAuthenticated || !auth.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const userId = auth.user.id
    await connectMongoose()

    const parsed = z.object({
      name: z.string().trim().min(2).max(120).optional(),
      phone: z.string().trim().max(20).optional(),
      company: z.string().trim().max(150).optional(),
      address: z.string().trim().max(500).optional(),
      currentPassword: z.string().min(1).max(256).optional(),
      newPassword: z.string().min(12).max(72).optional(),
      preferences: z.record(z.string(), z.unknown()).optional(),
    }).safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Informations invalides. Le nom doit contenir au moins 2 caractères et le nouveau mot de passe au moins 12.' }, { status: 400 })
    const body = parsed.data
    const { name, phone, company, address, currentPassword, newPassword, preferences } = body
    if (newPassword && keycloakEnabled()) return NextResponse.json({ error: 'Modifiez votre mot de passe auprès de votre fournisseur de connexion.' }, { status: 400 })
    if (Boolean(currentPassword) !== Boolean(newPassword)) return NextResponse.json({ error: 'Renseignez le mot de passe actuel et le nouveau mot de passe.' }, { status: 400 })
    if (phone && !/^(?:\+?221)?\d{9}$/.test(phone.replace(/[\s()-]/g, ''))) return NextResponse.json({ error: 'Numéro de téléphone sénégalais invalide.' }, { status: 400 })

    // Le JWT market n'est émis que pour des comptes User — pas de fallback Client.
    const profile: any = await User.findById(userId)

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    // Mise à jour des champs
    if (name) profile.name = name
    if (phone !== undefined) profile.phone = phone || undefined
    if (company) profile.company = company
    if (address) profile.address = address
    if (preferences) profile.preferences = { ...profile.preferences, ...preferences }

    let profileData = profile as any

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

      if (new TextEncoder().encode(newPassword).length > 72) {
        return NextResponse.json({ error: 'Le nouveau mot de passe est trop long en UTF-8 (72 octets maximum).' }, { status: 400 })
      }

      profile.passwordHash = await bcrypt.hash(newPassword, 12)
      const changes = profile.getChanges()
      if (changes.$set) delete changes.$set.sessionVersion
      profileData = await User.findOneAndUpdate({
        _id: userId,
        passwordHash,
        $expr: { $eq: [{ $ifNull: ['$sessionVersion', 0] }, auth.user.sessionVersion ?? 0] },
      }, {
        ...changes,
        $inc: { sessionVersion: 1 },
        $unset: { ...changes.$unset, twoFactorCode: 1, twoFactorExpires: 1, passwordResetToken: 1, passwordResetExpires: 1 },
      }, { new: true, runValidators: true })
      if (!profileData) return NextResponse.json({ error: 'Votre session a changé. Reconnectez-vous avant de réessayer.' }, { status: 409 })
      disconnectWebSessions(userId)
    } else {
      await profile.save()
    }
    
    const response = NextResponse.json({
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
    }, { headers: { 'Cache-Control': 'no-store' } })
    return newPassword ? clearAuthCookie(response) : response
  } catch (error) {
    console.error('Erreur mise à jour profil:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

