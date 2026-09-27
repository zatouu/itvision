import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { connectMongoose } from './mongoose'
import User from './models/User'
import { normalizePhone } from './sms'
import { createUserProfiles } from './user-profiles'
import { signAuthTokenWithExpiry } from './jwt'
import { verifyAuthServer } from './auth-server'

export interface ResolvedUser {
  userId: string
  role: string
  email?: string
  name?: string
  phone?: string
  isNew: boolean
  token?: string
  /**
   * Un compte existe déjà pour ce contact : aucune session n'est émise tant que
   * la possession du téléphone/email n'est pas prouvée (OTP ou mot de passe).
   * Le flux continue en invité, sans rattachement au compte existant.
   */
  requiresVerification?: boolean
}

export interface GuestData {
  name?: string
  phone?: string
  email?: string
}

/**
 * Résout l'utilisateur pour une action invitée (checkout, achat groupé...).
 * Si un token d'auth est présent, il est utilisé.
 * Sinon :
 * - contact inconnu → un compte CLIENT est créé à la volée + JWT (cookie posé) ;
 * - contact déjà rattaché à un compte → AUCUNE session (requiresVerification),
 *   le flux continue en invité pour ne jamais permettre la prise de contrôle
 *   d'un compte existant avec un simple numéro/email.
 */
export async function resolveGuestOrAuthUser(
  request: NextRequest,
  guestData: GuestData
): Promise<ResolvedUser> {
  // 1. Utilisateur déjà authentifié
  const auth = await verifyAuthServer(request)
  if (auth.isAuthenticated && auth.user) {
    return {
      userId: auth.user.id,
      role: auth.user.role,
      email: auth.user.email,
      name: auth.user.name,
      isNew: false,
    }
  }

  // 2. Sinon, créer/récupérer un compte invité
  const name = typeof guestData.name === 'string' ? guestData.name.trim() : ''
  const phone = normalizePhone(guestData.phone || '')
  const emailRaw = typeof guestData.email === 'string' ? guestData.email.trim() : ''
  const email = emailRaw && emailRaw.includes('@') ? emailRaw.toLowerCase() : ''

  if (!name || !phone) {
    throw new Error('Nom et téléphone requis pour continuer sans compte')
  }

  await connectMongoose()

  let user: any = null
  if (email) {
    user = await User.findOne({ email }).lean()
  }
  if (!user) {
    user = await User.findOne({ phone }).lean()
  }

  // Un compte existe déjà pour ce contact : ne JAMAIS émettre de session sans
  // preuve de possession (OTP ou mot de passe). Sinon n'importe qui connaissant
  // le numéro de téléphone public d'un vendeur pourrait prendre la main sur son
  // compte. Le flux continue en invité — sans rattachement au compte existant.
  if (user) {
    return {
      userId: '',
      role: 'GUEST',
      name,
      phone,
      email: email || undefined,
      isNew: false,
      requiresVerification: true,
    }
  }

  const safeEmail = email || `guest-${phone.replace(/\D/g, '')}@guest.itvisionplus.sn`
  const username = `guest-${phone.replace(/\D/g, '')}-${crypto.randomBytes(3).toString('hex')}`
  const randomPassword = crypto.randomBytes(16).toString('hex')
  const passwordHash = await bcrypt.hash(randomPassword, 10)

  const newUser = await User.create({
    username,
    email: safeEmail,
    passwordHash,
    name,
    phone,
    role: 'CLIENT',
    isActive: true,
    loginAttempts: 0,
  })

  await createUserProfiles(newUser._id, 'CLIENT').catch(err => {
    console.error('[guest-checkout] Erreur création profils:', err)
  })

  user = newUser.toObject()

  const token = await signAuthTokenWithExpiry(
    {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      username: user.username,
      name: user.name,
      phone: user.phone,
      marketplaceTier: user.marketplaceTier || 'standard',
    },
    '30d'
  )

  return {
    userId: String(user._id),
    role: user.role,
    email: user.email,
    name: user.name,
    phone: user.phone,
    isNew: true,
    token,
  }
}
