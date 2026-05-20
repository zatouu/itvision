import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'
import { emailService } from '@/lib/email-service'

const VALID_TIERS = ['standard', 'pro', 'reseller', 'partner'] as const

const TIER_LABELS: Record<string, string> = {
  standard: 'Standard',
  pro: 'Pro',
  reseller: 'Revendeur',
  partner: 'Partenaire',
}

const TIER_BENEFITS: Record<string, string[]> = {
  pro: ['Prix wholesale automatique des 1 piece', 'Frais de service reduits', 'Support prioritaire'],
  reseller: ['Tous les avantages Pro', 'Remises volume supplementaires', 'Facturation B2B', 'Compte dedie'],
  partner: ['Tous les avantages Revendeur', 'Conditions negociees sur mesure', 'API acces'],
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    const role = auth.role?.toUpperCase()
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    const { id } = await params
    const { tier } = await req.json()

    if (!tier || !VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: `Tier invalide. Valeurs acceptees: ${VALID_TIERS.join(', ')}` },
        { status: 400 }
      )
    }

    await connectMongoose()

    const user = await User.findById(id) as any
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const previousTier = user.marketplaceTier || 'standard'
    user.marketplaceTier = tier

    if (tier !== 'standard') {
      user.proValidatedAt = new Date()
    } else {
      user.proValidatedAt = undefined
      user.proRequestedAt = undefined
    }

    await user.save()

    // Envoyer un email de confirmation au client (best effort)
    if (user.email && tier !== 'standard' && tier !== previousTier) {
      try {
        const benefits = TIER_BENEFITS[tier] || []
        const benefitsList = benefits.map(b => `<li style="padding:4px 0;color:#374151">${b}</li>`).join('')

        await emailService.sendEmail({
          to: user.email,
          subject: `Votre compte ITVision Market a ete mis a niveau - ${TIER_LABELS[tier]}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:linear-gradient(135deg,#10b981,#8b5cf6);padding:24px;border-radius:12px 12px 0 0;text-align:center">
                <h2 style="color:white;margin:0">Compte ${TIER_LABELS[tier]} active</h2>
              </div>
              <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
                <p style="color:#374151">Bonjour ${user.name || ''},</p>
                <p style="color:#374151">Votre compte ITVision Market a ete mis a niveau vers <strong>${TIER_LABELS[tier]}</strong>.</p>
                ${benefitsList ? `<p style="color:#374151;font-weight:600;margin-bottom:8px">Vos avantages :</p><ul style="list-style:none;padding:0;margin:0 0 16px">${benefitsList}</ul>` : ''}
                <p style="color:#6b7280;font-size:12px;margin-top:16px">Ces avantages sont appliques automatiquement a vos prochaines commandes.</p>
              </div>
            </div>
          `.trim(),
        })
      } catch (err) {
        console.error('Erreur envoi email tier upgrade:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Tier mis a jour: ${previousTier} -> ${tier}`,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        marketplaceTier: user.marketplaceTier,
        proValidatedAt: user.proValidatedAt,
      },
    })
  } catch (error) {
    console.error('Erreur marketplace-tier:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
