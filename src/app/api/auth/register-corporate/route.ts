import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import Technician from '@/lib/models/Technician'
import Client from '@/lib/models/Client'
import { applyRateLimit, registerRateLimiter } from '@/lib/rate-limiter'
import { emailService } from '@/lib/email-service'
import { getClientInvitationEmail } from '@/lib/email-templates'

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

const MIN_FORM_FILL_TIME_MS = 3000

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères'
  if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule'
  if (!/[a-z]/.test(password)) return 'Le mot de passe doit contenir au moins une minuscule'
  if (!/\d/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Le mot de passe doit contenir au moins un caractère spécial'
  return null
}

async function verifyCaptchaToken(token: string, remoteIp?: string) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) return { success: true }
  if (!token) return { success: false, error: 'Captcha requis' }

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
      return { success: false, error: 'Échec de validation du captcha' }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Impossible de vérifier le captcha' }
  }
}

function generateClientId(): string {
  return 'CORP-' + crypto.randomBytes(6).toString('hex').toUpperCase()
}

function generateUsername(email: string): string {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9.]/g, '.')
  return `${base}.${crypto.randomInt(1000, 9999)}`.substring(0, 20)
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()

    const limited = await applyRateLimit(request, registerRateLimiter)
    if (limited) return limited

    const body = await request.json()
    const {
      email,
      password,
      name,
      phone,
      company,
      address,
      city,
      country = 'Sénégal',
      captchaToken = '',
      website = '',
      formLoadTime = 0
    } = body

    const forwardedFor = request.headers.get('x-forwarded-for') || ''
    const remoteIp = forwardedFor.split(',')[0]?.trim() || undefined

    // Honeypot
    if (website) {
      console.warn('[REGISTER-CORP] Honeypot triggered:', { email, ip: remoteIp })
      return NextResponse.json({ error: 'Inscription invalide' }, { status: 400 })
    }

    const elapsed = Date.now() - Number(formLoadTime)
    if (formLoadTime && elapsed < MIN_FORM_FILL_TIME_MS) {
      console.warn('[REGISTER-CORP] Form submitted too fast:', { email, elapsedMs: elapsed, ip: remoteIp })
      return NextResponse.json({ error: 'Soumission trop rapide. Veuillez réessayer.' }, { status: 400 })
    }

    const captchaCheck = await verifyCaptchaToken(String(captchaToken || ''), remoteIp)
    if (!captchaCheck.success) {
      return NextResponse.json({ error: captchaCheck.error || 'Captcha invalide' }, { status: 400 })
    }

    if (!email || !password || !name || !phone || !company) {
      return NextResponse.json({
        error: 'Les champs nom, email, téléphone, entreprise et mot de passe sont requis'
      }, { status: 400 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()

    if (!validateEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Format d\'email invalide' }, { status: 400 })
    }

    if (isDisposableEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Les adresses email temporaires ne sont pas autorisées' }, { status: 400 })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    // Vérifier que l'email n'est pas déjà utilisé
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return NextResponse.json({
        error: 'Un compte existe déjà avec cette adresse email'
      }, { status: 409 })
    }

    const existingTechnician = await Technician.findOne({ email: normalizedEmail }).lean()
    if (existingTechnician) {
      return NextResponse.json({
        error: 'Cet email est déjà utilisé par un compte technicien'
      }, { status: 409 })
    }

    const existingClient = await Client.findOne({ email: normalizedEmail })
    if (existingClient) {
      return NextResponse.json({
        error: 'Une fiche entreprise existe déjà avec cette adresse email. Contactez l\'administrateur.'
      }, { status: 409 })
    }

    // Générer un clientId unique
    let clientId = generateClientId()
    let attempts = 0
    while (await Client.findOne({ clientId }).select('_id').lean()) {
      clientId = generateClientId()
      attempts++
      if (attempts > 10) break
    }

    // Créer la fiche client entreprise (inacte en attendant validation admin)
    const client = await Client.create({
      clientId,
      name: String(name).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      company: String(company).trim(),
      address: String(address || '').trim(),
      city: String(city || '').trim(),
      country: String(country).trim(),
      contactPerson: String(name).trim(),
      isActive: false,
      permissions: {
        canViewReports: true,
        canRequestMaintenance: true,
        canAccessPortal: true
      },
      notes: 'Compte créé via inscription en ligne. En attente de validation admin.',
      tags: ['self-service'],
      category: 'Entreprise',
      lastContact: new Date()
    })

    // Créer le compte utilisateur lié (inactif)
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const username = generateUsername(normalizedEmail)

    const newUser = await User.create({
      username,
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      name: String(name).trim(),
      phone: String(phone).trim(),
      role: 'CLIENT',
      company: String(company).trim(),
      companyClientId: client._id,
      isActive: false,
      forcePasswordReset: true,
      passwordResetToken: resetToken,
      passwordResetExpires: tokenExpires
    })

    // Envoyer l'email de confirmation de demande
    try {
      const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`
      const emailContent = getClientInvitationEmail(String(name).trim(), resetUrl)
      await emailService.sendEmail({
        to: normalizedEmail,
        subject: 'Demande de compte entreprise reçue — IT Vision',
        html: `<p>Bonjour ${String(name).trim()},</p>
          <p>Nous avons bien reçu votre demande de création de compte entreprise. Votre compte sera activé après validation par notre équipe.</p>
          <p>Vous recevrez un email de confirmation dès que votre accès sera ouvert.</p>
          <p>En attendant, vous pouvez définir votre mot de passe via ce lien : <a href="${resetUrl}">${resetUrl}</a></p>
          <p>Cordialement,<br/>L'équipe IT Vision</p>`,
        text: `Bonjour ${String(name).trim()},\n\nNous avons bien reçu votre demande de création de compte entreprise. Votre compte sera activé après validation par notre équipe.\n\nLien pour définir votre mot de passe : ${resetUrl}\n\nCordialement,\nL'équipe IT Vision`
      })
    } catch (emailError) {
      console.error('[REGISTER-CORP] Email notification failed:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Demande de compte entreprise enregistrée. Elle sera activée après validation par notre équipe.',
      userId: String(newUser._id),
      clientId: String(client._id)
    }, { status: 201 })

  } catch (error) {
    console.error('[REGISTER-CORP] Server error:', error)
    const anyError = error as any
    if (typeof anyError?.code === 'number' && anyError.code === 121) {
      return NextResponse.json({
        error: 'Erreur de configuration de la base de données (validation).',
        code: 'DB_VALIDATION_FAILED'
      }, { status: 500 })
    }
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({
        error: 'Un compte existe déjà avec ces informations'
      }, { status: 409 })
    }
    return NextResponse.json({
      error: 'Erreur serveur lors de la création du compte entreprise'
    }, { status: 500 })
  }
}
