import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import Technician from '@/lib/models/Technician'
import emailService from '@/lib/email-service'
import { MARKET_BRAND } from '@/lib/branding'
import { applyRateLimit, registerRateLimiter } from '@/lib/rate-limiter'
import { createUserProfiles } from '@/lib/user-profiles'
import { getClientIp } from '@/lib/client-ip'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'tempmail.net',
  'throwaway.email', 'trashmail.com', 'trashmail.net', 'fakeinbox.com',
  '10minutemail.com', '10minutemail.net', 'yopmail.com', 'getnada.com',
  'maildrop.cc', 'dispostable.com', 'sharklasers.com', 'guerrillamail.net',
  'spam4.me', 'mailnesia.com', 'tempmailo.com', 'tempr.email',
  'burnermail.io', 'mohmal.com', 'tmpmail.org', 'tmpmail.net',
  'moakt.com', 'mailtemp.top', 'emailondeck.com', 'temp-mail.org',
])

const MIN_FORM_FILL_TIME_MS = 3000 // 3 secondes minimum pour remplir le formulaire
const MAX_FORM_AGE_MS = 6 * 60 * 60 * 1000 // formulaire chargé il y a plus de 6 h : à recharger

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false
}

/** Clé publique Turnstile, lue à l'exécution (pas besoin de reconstruire l'image pour l'activer). */
function turnstileSiteKey() {
  return process.env.TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
}

async function verifyCaptchaToken(token: string, remoteIp?: string) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // Sans clé : refus en production (des robots créaient des comptes en masse quand le captcha
  // s'éteignait silencieusement). REGISTRATION_CAPTCHA=off le désactive explicitement.
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production' && process.env.REGISTRATION_CAPTCHA !== 'off') {
      console.error('[REGISTER] TURNSTILE_SECRET_KEY absente : inscriptions publiques refusées (REGISTRATION_CAPTCHA=off pour forcer)')
      return {
        success: false,
        error: 'Inscription momentanément indisponible. Réessayez plus tard ou contactez-nous.'
      }
    }
    return { success: true }
  }

  if (!token) {
    return {
      success: false,
      error: 'Captcha requis'
    }
  }

  const payload = new URLSearchParams()
  payload.set('secret', secretKey)
  payload.set('response', token)
  if (remoteIp) payload.set('remoteip', remoteIp)

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString()
    })

    const data = await response.json().catch(() => null) as { success?: boolean } | null

    if (!response.ok || !data?.success) {
      return {
        success: false,
        error: 'Échec de validation du captcha'
      }
    }

    return { success: true }
  } catch {
    return {
      success: false,
      error: 'Impossible de vérifier le captcha'
    }
  }
}

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
    // Cette route ne crée que des comptes CLIENT marketplace — l'email de
    // bienvenue est toujours brandé DDM+, quel que soit le host de la requête.
    const brand = MARKET_BRAND

    // Rate limiting strict pour les inscriptions (3 par 15min par IP)
    const limited = await applyRateLimit(request, registerRateLimiter)
    if (limited) return limited

    const { email, password, name, phone, role = 'CLIENT', captchaToken = '', website = '', formLoadTime = 0, referredBy = '' } = await request.json()

    const remoteIp = getClientIp(request)

    // Honeypot : si le champ caché 'website' est rempli, c'est un bot
    if (website) {
      console.warn('[REGISTER] Honeypot triggered — bot detected:', { email, ip: remoteIp })
      return NextResponse.json({ error: 'Inscription invalide' }, { status: 400 })
    }

    // Temps de remplissage : obligatoire (un appel direct à l'API sans formulaire est refusé)
    const loadedAt = Number(formLoadTime)
    const elapsed = Date.now() - loadedAt
    if (!Number.isFinite(loadedAt) || loadedAt <= 0 || elapsed > MAX_FORM_AGE_MS) {
      console.warn('[REGISTER] formLoadTime absent ou invalide — appel hors formulaire:', { email, ip: remoteIp })
      return NextResponse.json({ error: 'Formulaire expiré : rechargez la page et réessayez.' }, { status: 400 })
    }
    if (elapsed < MIN_FORM_FILL_TIME_MS) {
      console.warn('[REGISTER] Form submitted too fast — likely bot:', { email, elapsedMs: elapsed, ip: remoteIp })
      return NextResponse.json({ error: 'Soumission trop rapide. Veuillez réessayer.' }, { status: 400 })
    }

    const captchaCheck = await verifyCaptchaToken(String(captchaToken || ''), remoteIp === 'unknown' ? undefined : remoteIp)
    if (!captchaCheck.success) {
      return NextResponse.json({
        error: captchaCheck.error || 'Captcha invalide'
      }, { status: 400 })
    }

    // Base sollicitée seulement après les contrôles anti-robots
    await connectMongoose()

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

    // Blocage des emails jetables (anti-bot)
    if (isDisposableEmail(email)) {
      console.warn('[REGISTER] Disposable email blocked:', { email, ip: remoteIp })
      return NextResponse.json({ 
        error: 'Les adresses email temporaires ne sont pas autorisées' 
      }, { status: 400 })
    }

    // Validation du mot de passe
    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    // Inscription publique : seul le rôle CLIENT (marketplace) est autorisé.
    // Les comptes TECHNICIAN et ADMIN sont créés via des processus internes/admin.
    const normalizedRole = role.toUpperCase()
    if (normalizedRole !== 'CLIENT') {
      return NextResponse.json({
        error: 'Rôle non autorisé pour l\'inscription publique'
      }, { status: 403 })
    }

    // Vérifier si l'email existe déjà
    const normalizedEmail = email.toLowerCase()
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return NextResponse.json({ 
        error: 'Un compte existe déjà avec cette adresse email' 
      }, { status: 409 })
    }

    // Empêcher qu'un email de technicien soit recyclé en compte marketplace
    const existingTechnician = await Technician.findOne({ email: normalizedEmail }).lean()
    if (existingTechnician) {
      return NextResponse.json({
        error: 'Cet email est déjà utilisé par un compte technicien'
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

    // Nettoyer le code de parrainage
    const normalizedReferral = typeof referredBy === 'string' ? referredBy.toUpperCase().trim() : undefined

    // Code de parrainage personnel unique (base du lien de parrainage)
    let referralCode = `DDM${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    while (await User.findOne({ referralCode }).select('_id').lean()) {
      referralCode = `DDM${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    }

    // Créer l'utilisateur
    const newUser = new User({
      username,
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
      phone: phone?.trim() || undefined,
      role: role.toUpperCase(),
      isActive: true,
      loginAttempts: 0,
      referralCode,
      ...(normalizedReferral ? { referredBy: normalizedReferral } : {})
    })

    await newUser.save()

    // Créer les profils découplés par domaine
    await createUserProfiles(newUser._id, role.toUpperCase()).catch(profileErr => {
      console.error('[REGISTER] Erreur création profils utilisateur:', profileErr)
    })

    console.log(`[REGISTER] Nouvel utilisateur créé: ${email} (${role})`)

    // Envoyer l'email de bienvenue
    try {
      const emailData = emailService.generateWelcomeEmail(email, name, brand)
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

    // Validator MongoDB (collection-level) : configuration incompatible
    // Ex: enum role en minuscules alors que l'app utilise des rôles en MAJUSCULES.
    const anyError = error as any
    if (typeof anyError?.code === 'number' && anyError.code === 121) {
      return NextResponse.json({
        error: 'Erreur de configuration de la base de données (validation).',
        code: 'DB_VALIDATION_FAILED'
      }, { status: 500 })
    }
    
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
    const { searchParams } = new URL(request.url)

    // Configuration du captcha pour le formulaire (clé publique uniquement)
    if (searchParams.get('captcha') === '1') {
      return NextResponse.json({ siteKey: turnstileSiteKey() }, { headers: { 'Cache-Control': 'no-store' } })
    }

    await connectMongoose()
    
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