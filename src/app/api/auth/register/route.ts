import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import Technician from '@/lib/models/Technician'
import emailService from '@/lib/email-service'
import { getBrandFromHost } from '@/lib/branding'
import { applyRateLimit, registerRateLimiter } from '@/lib/rate-limiter'
import { createUserProfiles } from '@/lib/user-profiles'

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

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false
}

async function verifyCaptchaToken(token: string, remoteIp?: string) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // Captcha opt-in : il n'est imposé que si la clé secrète est configurée.
  // Sans clé, le widget n'est pas rendu côté client (NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  // donc on n'exige pas de captcha — sinon l'inscription serait impossible en prod.
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[REGISTER] TURNSTILE_SECRET_KEY non configurée : captcha désactivé. ' +
        'Définissez TURNSTILE_SECRET_KEY (+ NEXT_PUBLIC_TURNSTILE_SITE_KEY) pour l\'activer.'
      )
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
    await connectMongoose()
    const brand = getBrandFromHost(request.nextUrl.host)

    // Rate limiting strict pour les inscriptions (3 par 15min par IP)
    const limited = await applyRateLimit(request, registerRateLimiter)
    if (limited) return limited

    const { email, password, name, phone, role = 'CLIENT', captchaToken = '', website = '', formLoadTime = 0, referredBy = '' } = await request.json()

    const forwardedFor = request.headers.get('x-forwarded-for') || ''
    const remoteIp = forwardedFor.split(',')[0]?.trim() || undefined

    // Honeypot : si le champ caché 'website' est rempli, c'est un bot
    if (website) {
      console.warn('[REGISTER] Honeypot triggered — bot detected:', { email, ip: remoteIp })
      return NextResponse.json({ error: 'Inscription invalide' }, { status: 400 })
    }

    // Check temps de soumission : un humain met au moins quelques secondes
    const elapsed = Date.now() - Number(formLoadTime)
    if (formLoadTime && elapsed < MIN_FORM_FILL_TIME_MS) {
      console.warn('[REGISTER] Form submitted too fast — likely bot:', { email, elapsedMs: elapsed, ip: remoteIp })
      return NextResponse.json({ error: 'Soumission trop rapide. Veuillez réessayer.' }, { status: 400 })
    }

    const captchaCheck = await verifyCaptchaToken(String(captchaToken || ''), remoteIp)
    if (!captchaCheck.success) {
      return NextResponse.json({
        error: captchaCheck.error || 'Captcha invalide'
      }, { status: 400 })
    }

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