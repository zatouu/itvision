import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { requireDomainAccess } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import emailService from '@/lib/email-service'
import { getClientInvitationEmail } from '@/lib/email-templates'
import { getBrandFromHost } from '@/lib/branding'
import { logAuditEvent } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const COMPANY_ROLES = ['owner', 'admin', 'finance', 'technical', 'viewer'] as const
const MANAGER_ROLES = ['owner', 'admin'] // seuls ces rôles gèrent l'équipe

async function getAccess(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return { error: result.response }
  return result
}

async function callerRole(userId: string, companyId: string) {
  const me = await User.findOne({ _id: userId, companyClientId: companyId }).select('companyRole').lean() as any
  // Comptes d'origine sans companyRole = owner par défaut
  return me?.companyRole || 'owner'
}

function isManager(role: string) {
  return MANAGER_ROLES.includes(role as any)
}

/** GET /api/client-enterprise/team — membres + invitations en attente */
export async function GET(request: NextRequest) {
  const ctx = await getAccess(request)
  if ('error' in ctx) return ctx.error
  const { access } = ctx

  await connectDB()
  const companyId = access.profiles.companyClientId
  if (!companyId) return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })

  const members = await User.find({ companyClientId: companyId, isActive: { $ne: false } })
    .select('name email companyRole createdAt passwordResetExpires')
    .sort({ createdAt: 1 })
    .lean() as any[]

  return NextResponse.json({
    members: members.map(m => ({
      id: String(m._id),
      name: m.name,
      email: m.email,
      companyRole: m.companyRole || 'owner',
      // invitation en attente : compte créé mais mot de passe pas encore défini
      pending: !!m.passwordResetExpires && new Date(m.passwordResetExpires) > new Date(),
      isSelf: String(m._id) === access.userId,
      createdAt: m.createdAt,
    })),
    canManage: isManager(await callerRole(access.userId, String(companyId))),
  })
}

/** POST — inviter un membre (crée le compte + email d'activation) */
export async function POST(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, serviceWriteRateLimiter)
  if (rateLimit) return rateLimit

  const ctx = await getAccess(request)
  if ('error' in ctx) return ctx.error
  const { access } = ctx

  await connectDB()
  const companyId = access.profiles.companyClientId
  if (!companyId) return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })
  if (!isManager(await callerRole(access.userId, String(companyId)))) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  }

  const body = await request.json()
  const email = String(body.email || '').trim().toLowerCase()
  const name = String(body.name || '').trim() || email.split('@')[0]
  const companyRole = body.companyRole || 'viewer'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }
  if (!COMPANY_ROLES.includes(companyRole)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  const existing = await User.findOne({ email }).select('_id').lean()
  if (existing) {
    return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })
  }

  // Mot de passe aléatoire — remplacé par l'invité via le lien d'activation
  const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10)
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 72 * 3600 * 1000) // 72h pour activer

  const user = await User.create({
    name,
    email,
    password,
    role: 'CLIENT',
    companyClientId: new mongoose.Types.ObjectId(String(companyId)),
    companyRole,
    isActive: true,
    passwordResetToken: token,
    passwordResetExpires: expires,
  })

  // Email d'activation via le flux reset-password existant
  const brand = getBrandFromHost(request.nextUrl.host)
  const activateUrl = `${brand.url}/reset-password?token=${token}`
  const tpl = getClientInvitationEmail(name, activateUrl, brand)
  await emailService.sendEmail({ to: email, brand, subject: tpl.subject, html: tpl.html })
    .catch(err => console.error('[team] email invitation:', err))

  void logAuditEvent({
    entityType: 'Client',
    entityId: String(companyId),
    action: 'team_invite',
    userId: access.userId,
    userRole: 'CLIENT',
    clientCompanyId: String(companyId),
    metadata: { invitedEmail: email, companyRole },
  })

  return NextResponse.json({ success: true, memberId: String(user._id) }, { status: 201 })
}

/** PATCH — changer le rôle interne d'un membre */
export async function PATCH(request: NextRequest) {
  const ctx = await getAccess(request)
  if ('error' in ctx) return ctx.error
  const { access } = ctx

  await connectDB()
  const companyId = access.profiles.companyClientId
  if (!companyId) return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })
  if (!isManager(await callerRole(access.userId, String(companyId)))) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  }

  const { memberId, companyRole } = await request.json()
  if (!memberId || !mongoose.Types.ObjectId.isValid(memberId) || !COMPANY_ROLES.includes(companyRole)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }
  if (String(memberId) === access.userId) {
    return NextResponse.json({ error: 'Impossible de modifier votre propre rôle' }, { status: 400 })
  }

  const res = await User.updateOne(
    { _id: memberId, companyClientId: companyId },
    { $set: { companyRole } }
  )
  if (res.matchedCount === 0) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

  void logAuditEvent({
    entityType: 'Client', entityId: String(companyId), action: 'team_role',
    userId: access.userId, userRole: 'CLIENT', clientCompanyId: String(companyId),
    metadata: { memberId, companyRole },
  })

  return NextResponse.json({ success: true })
}

/** DELETE — retirer un membre de l'entreprise (le compte devient un client marketplace) */
export async function DELETE(request: NextRequest) {
  const ctx = await getAccess(request)
  if ('error' in ctx) return ctx.error
  const { access } = ctx

  await connectDB()
  const companyId = access.profiles.companyClientId
  if (!companyId) return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })
  if (!isManager(await callerRole(access.userId, String(companyId)))) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  }

  const { memberId } = await request.json()
  if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }
  if (String(memberId) === access.userId) {
    return NextResponse.json({ error: 'Impossible de vous retirer vous-même' }, { status: 400 })
  }

  const res = await User.updateOne(
    { _id: memberId, companyClientId: companyId },
    { $unset: { companyClientId: 1, companyRole: 1 } }
  )
  if (res.matchedCount === 0) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

  void logAuditEvent({
    entityType: 'Client', entityId: String(companyId), action: 'team_remove',
    userId: access.userId, userRole: 'CLIENT', clientCompanyId: String(companyId),
    metadata: { memberId },
  })

  return NextResponse.json({ success: true })
}
