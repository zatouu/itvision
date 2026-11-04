import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Technician from '@/lib/models/Technician'
import User from '@/lib/models/User'
import { emailService } from '@/lib/email-service'
import { CORPORATE_BRAND } from '@/lib/branding'

const INVITE_DAYS = 7
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export type AccessResult = { technicianId: string; name: string; status: 'existing' | 'invited' | 'no_email' | 'error' }

/**
 * Garantit qu'un technicien affecté peut ouvrir son portail.
 * Sans compte : création d'un compte TECHNICIAN (mot de passe aléatoire inutilisable) + mail
 * d'activation (lien « choisir mon mot de passe », valable 7 jours). Jamais bloquant.
 */
export async function ensureTechnicianAccess(technicianId: unknown, context?: { interventionTitle?: string }): Promise<AccessResult> {
  const id = String(technicianId || '')
  const base: AccessResult = { technicianId: id, name: 'Technicien', status: 'error' }
  try {
    if (!mongoose.isValidObjectId(id)) return base
    await connectMongoose()
    const tech = await Technician.findById(id).select('name email phone').lean() as any
    if (!tech) return base
    const name = tech.name || 'Technicien'
    const email = String(tech.email || '').toLowerCase().trim()
    if (!email || !email.includes('@')) return { technicianId: id, name, status: 'no_email' }
    if (await User.exists({ email })) return { technicianId: id, name, status: 'existing' }

    const token = crypto.randomBytes(32).toString('hex')
    await User.create({
      username: `${email.split('@')[0]}_tech_${Date.now().toString(36)}`,
      email,
      passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
      name,
      phone: tech.phone || '',
      role: 'TECHNICIAN',
      isActive: true,
      passwordResetToken: token,
      passwordResetExpires: new Date(Date.now() + INVITE_DAYS * 86400_000),
    })

    const brand = CORPORATE_BRAND
    const link = `${brand.url}/reset-password?token=${token}`
    await emailService.sendEmail({
      to: email,
      brand,
      fromName: brand.name,
      subject: `Votre accès au portail technicien ${brand.name}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#065f46;margin:0 0 12px">Bienvenue ${esc(name)}</h2>
        <p>Une intervention vous a été confiée${context?.interventionTitle ? ` : <strong>${esc(context.interventionTitle)}</strong>` : ''}.</p>
        <p>Votre portail technicien vous permet de voir vos interventions, d'y pointer votre arrivée et de remplir le rapport sur place.</p>
        <p style="margin:22px 0"><a href="${link}" style="background:#065f46;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Activer mon accès</a></p>
        <p style="color:#6b7280;font-size:13px">Choisissez votre mot de passe, puis connectez-vous avec <strong>${esc(email)}</strong>. Lien valable ${INVITE_DAYS} jours.</p>
      </div>`,
      text: `Bienvenue ${name}. Activez votre accès au portail technicien : ${link} (valable ${INVITE_DAYS} jours). Identifiant : ${email}`,
    })
    return { technicianId: id, name, status: 'invited' }
  } catch (e) {
    console.error('[technician-access]', e)
    return base
  }
}
