import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { requireDomainAccess, requireCompanyCapability, canCompany, companyRoleOf, companyPermissionsOf } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import emailService from '@/lib/email-service'
import { getClientInvitationEmail } from '@/lib/email-templates'
import { getBrandFromHost } from '@/lib/branding'
import { logAuditEvent } from '@/lib/audit'
import { isCompanyRole, memberCapabilities, sanitizeCapabilities, type CompanyRole } from '@/lib/company-rights'

export const dynamic = 'force-dynamic'

const INVITE_TTL_MS = 72 * 3600 * 1000

async function getAccess(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return { error: result.response }
  const companyId = result.access.profiles.companyClientId
  if (!companyId) return { error: NextResponse.json({ error: 'Pas de société liée' }, { status: 403 }) }
  return { access: result.access, companyId }
}

async function sendInvitation(request: NextRequest, name: string, email: string, token: string) {
  const brand = getBrandFromHost(request.nextUrl.host)
  const tpl = getClientInvitationEmail(name, `${brand.url}/reset-password?token=${token}`, brand)
  return emailService.sendEmail({ to: email, brand, subject: tpl.subject, html: tpl.html })
    .catch(err => { console.error('[team] email invitation:', err); return false })
}

/** Nombre de membres actifs pouvant encore gérer l'équipe (évite de verrouiller l'espace). */
async function managersLeft(companyId: string, excludeId: string) {
  const others = await User.find({ companyClientId: companyId, _id: { $ne: excludeId }, isActive: { $ne: false } })
    .select('companyRole companyCapabilities').lean() as any[]
  return others.filter(m => memberCapabilities(isCompanyRole(m.companyRole) ? m.companyRole : 'owner', m.companyCapabilities).includes('team:manage')).length
}

/** GET /api/client-enterprise/team — membres, invitations, droits de chacun */
export async function GET(request: NextRequest) {
  const ctx = await getAccess(request)
  if ('error' in ctx) return ctx.error
  const { access, companyId } = ctx

  await connectDB()
  const members = await User.find({ companyClientId: companyId, isActive: { $ne: false } })
    .select('name email companyRole companyCapabilities createdAt companyInvitePending passwordResetExpires')
    .sort({ createdAt: 1 })
    .lean() as any[]

  const now = Date.now()
  const perms = companyPermissionsOf(access)
  return NextResponse.json({
    members: members.map(m => {
      const role: CompanyRole = isCompanyRole(m.companyRole) ? m.companyRole : 'owner'
      const invited = m.companyInvitePending === true
      return {
        id: String(m._id),
        name: m.name,
        email: m.email,
        companyRole: role,
        capabilities: memberCapabilities(role, m.companyCapabilities),
        custom: role !== 'owner' && Array.isArray(m.companyCapabilities),
        pending: invited && !!m.passwordResetExpires && new Date(m.passwordResetExpires).getTime() > now,
        expired: invited && (!m.passwordResetExpires || new Date(m.passwordResetExpires).getTime() <= now),
        isSelf: String(m._id) === access.userId,
        createdAt: m.createdAt,
      }
    }),
    canManage: canCompany(access, 'team:manage'),
    viewerIsOwner: companyRoleOf(access) === 'owner',
    // Services coupés par IT Vision : les droits correspondants n'ont pas d'effet
    services: { reports: perms.canViewReports, maintenance: perms.canRequestMaintenance },
  })
}

/** POST — inviter un membre (crée le compte + email d'activation) */
export async function POST(request: NextRequest) {
  const rateLimit = await applyRateLimit(request, serviceWriteRateLimiter)
  if (rateLimit) return rateLimit

  const ctx = await getAccess(request)
  if ('error' in ctx) return ctx.error
  const { access, companyId } = ctx

  const denied = requireCompanyCapability(access, 'team:manage')
  if (denied) return denied

  await connectDB()
  const body = await request.json().catch(() => ({})) as any
  const email = String(body.email || '').trim().toLowerCase()
  const name = String(body.name || '').trim().slice(0, 120) || email.split('@')[0]
  const companyRole = body.companyRole || 'viewer'
  const custom = sanitizeCapabilities(body.capabilities)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }
  if (!isCompanyRole(companyRole) || companyRole === 'owner') {
    return NextResponse.json({ error: 'Profil invalide' }, { status: 400 })
  }

  const existing = await User.findOne({ email }).select('_id companyClientId').lean() as any
  if (existing) {
    return NextResponse.json({
      error: String(existing.companyClientId) === String(companyId)
        ? 'Cette personne fait déjà partie de votre espace'
        : "Cet email est déjà utilisé par un autre compte. Contactez IT Vision pour le rattacher à votre espace.",
    }, { status: 409 })
  }

  // Mot de passe aléatoire — remplacé par l'invité via le lien d'activation
  const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10)
  const token = crypto.randomBytes(32).toString('hex')

  const user = await User.create({
    name,
    email,
    password,
    role: 'CLIENT',
    companyClientId: new mongoose.Types.ObjectId(String(companyId)),
    companyRole,
    ...(custom ? { companyCapabilities: custom } : {}),
    isActive: true,
    companyInvitePending: true,
    passwordResetToken: token,
    passwordResetExpires: new Date(Date.now() + INVITE_TTL_MS),
  })

  const sent = await sendInvitation(request, name, email, token)

  void logAuditEvent({
    entityType: 'Client',
    entityId: String(companyId),
    action: 'team_invite',
    userId: access.userId,
    userRole: 'CLIENT',
    clientCompanyId: String(companyId),
    metadata: { invitedEmail: email, companyRole, custom: !!custom },
  })

  return NextResponse.json({ success: true, memberId: String(user._id), emailSent: sent }, { status: 201 })
}

/**
 * PATCH — { memberId, companyRole?, capabilities?: string[] | null } règle le profil / les droits ;
 *         { memberId, action: 'resend' } renvoie l'invitation.
 */
export async function PATCH(request: NextRequest) {
  const ctx = await getAccess(request)
  if ('error' in ctx) return ctx.error
  const { access, companyId } = ctx

  const denied = requireCompanyCapability(access, 'team:manage')
  if (denied) return denied

  await connectDB()
  const body = await request.json().catch(() => ({})) as any
  const memberId = String(body.memberId || '')
  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }
  if (memberId === access.userId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas modifier vos propres droits' }, { status: 400 })
  }

  const member = await User.findOne({ _id: memberId, companyClientId: companyId })
    .select('name email companyRole companyCapabilities companyInvitePending').lean() as any
  if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

  const actorIsOwner = companyRoleOf(access) === 'owner'
  const memberRole: CompanyRole = isCompanyRole(member.companyRole) ? member.companyRole : 'owner'
  if (memberRole === 'owner' && !actorIsOwner) {
    return NextResponse.json({ error: 'Seul un propriétaire peut modifier un autre propriétaire' }, { status: 403 })
  }

  if (body.action === 'resend') {
    if (member.companyInvitePending !== true) {
      return NextResponse.json({ error: 'Ce membre a déjà activé son compte' }, { status: 409 })
    }
    const token = crypto.randomBytes(32).toString('hex')
    await User.updateOne({ _id: member._id }, { $set: { passwordResetToken: token, passwordResetExpires: new Date(Date.now() + INVITE_TTL_MS) } })
    const sent = await sendInvitation(request, member.name || member.email, member.email, token)
    void logAuditEvent({
      entityType: 'Client', entityId: String(companyId), action: 'team_invite_resent',
      userId: access.userId, userRole: 'CLIENT', clientCompanyId: String(companyId),
      metadata: { memberId, email: member.email },
    })
    return NextResponse.json({ success: true, emailSent: sent })
  }

  const nextRole = body.companyRole !== undefined ? body.companyRole : memberRole
  if (!isCompanyRole(nextRole)) return NextResponse.json({ error: 'Profil invalide' }, { status: 400 })
  if (nextRole === 'owner' && !actorIsOwner) {
    return NextResponse.json({ error: 'Seul un propriétaire peut désigner un autre propriétaire' }, { status: 403 })
  }

  // Changer de profil sans préciser de droits = revenir aux droits du profil
  const custom = body.capabilities === null || (body.companyRole !== undefined && body.capabilities === undefined)
    ? null
    : sanitizeCapabilities(body.capabilities) ?? (Array.isArray(member.companyCapabilities) ? member.companyCapabilities : null)

  const nextCaps = memberCapabilities(nextRole, custom)
  if (!nextCaps.includes('team:manage') && memberCapabilities(memberRole, member.companyCapabilities).includes('team:manage')
    && await managersLeft(String(companyId), memberId) === 0) {
    return NextResponse.json({ error: "Au moins une personne doit pouvoir gérer l'équipe" }, { status: 409 })
  }

  const update: any = { $set: { companyRole: nextRole } }
  if (custom && nextRole !== 'owner') update.$set.companyCapabilities = custom
  else update.$unset = { companyCapabilities: 1 }
  await User.updateOne({ _id: member._id }, update)

  void logAuditEvent({
    entityType: 'Client', entityId: String(companyId), action: 'team_role',
    userId: access.userId, userRole: 'CLIENT', clientCompanyId: String(companyId),
    metadata: { memberId, companyRole: nextRole, capabilities: custom || undefined },
  })

  return NextResponse.json({ success: true, capabilities: nextCaps, custom: !!custom && nextRole !== 'owner' })
}

/** DELETE — retirer un membre de l'entreprise (le compte devient un client marketplace) ou annuler une invitation */
export async function DELETE(request: NextRequest) {
  const ctx = await getAccess(request)
  if ('error' in ctx) return ctx.error
  const { access, companyId } = ctx

  const denied = requireCompanyCapability(access, 'team:manage')
  if (denied) return denied

  await connectDB()
  const { memberId } = await request.json().catch(() => ({})) as any
  if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }
  if (String(memberId) === access.userId) {
    return NextResponse.json({ error: 'Impossible de vous retirer vous-même' }, { status: 400 })
  }

  const member = await User.findOne({ _id: memberId, companyClientId: companyId })
    .select('companyRole companyCapabilities companyInvitePending').lean() as any
  if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })
  const memberRole: CompanyRole = isCompanyRole(member.companyRole) ? member.companyRole : 'owner'
  if (memberRole === 'owner' && companyRoleOf(access) !== 'owner') {
    return NextResponse.json({ error: 'Seul un propriétaire peut retirer un autre propriétaire' }, { status: 403 })
  }

  // Invitation jamais activée : le compte a été créé par l'invitation et n'a jamais servi, on le supprime
  const neverActivated = member.companyInvitePending === true
  if (neverActivated) {
    await User.deleteOne({ _id: memberId, companyClientId: companyId, companyInvitePending: true })
  } else {
    await User.updateOne(
      { _id: memberId, companyClientId: companyId },
      { $unset: { companyClientId: 1, companyRole: 1, companyCapabilities: 1 } }
    )
  }

  void logAuditEvent({
    entityType: 'Client', entityId: String(companyId), action: neverActivated ? 'team_invite_cancelled' : 'team_remove',
    userId: access.userId, userRole: 'CLIENT', clientCompanyId: String(companyId),
    metadata: { memberId },
  })

  return NextResponse.json({ success: true })
}
