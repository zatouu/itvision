import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import Campaign from '@/lib/models/Campaign'
import Lead from '@/lib/models/Lead'
import { emailService } from '@/lib/email-service'
import { CORPORATE_BRAND } from '@/lib/branding'

function requireAdmin(request: NextRequest) {
  return requireAuth(request).then(({ role, userId }) => {
    const r = String(role || '').toUpperCase()
    if (!['ADMIN', 'SUPER_ADMIN'].includes(r)) throw new Error('Accès non autorisé')
    return userId
  })
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status') || ''

    const filter: Record<string, unknown> = {}
    if (status) filter.status = status

    const skip = (page - 1) * limit
    const [campaigns, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Campaign.countDocuments(filter),
    ])

    return NextResponse.json({
      campaigns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Accès non autorisé') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[CAMPAIGNS API GET]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const userId = await requireAdmin(request)

    const body = await request.json()
    const { name, subject, htmlContent, textContent, sector, city, action } = body

    if (!name || !subject || !htmlContent) {
      return NextResponse.json({ error: 'Nom, sujet et contenu HTML requis' }, { status: 400 })
    }

    if (action === 'send') {
      // Resolve target leads
      const leadFilter: Record<string, unknown> = { status: { $in: ['new', 'contacted', 'interested'] } }
      if (sector) leadFilter.sector = sector
      if (city) leadFilter.city = { $regex: city, $options: 'i' }

      const leads = await Lead.find(leadFilter).lean() as any[]
      if (leads.length === 0) {
        return NextResponse.json({ error: 'Aucun lead correspondant aux critères' }, { status: 400 })
      }

      const campaign = await Campaign.create({
        name,
        subject,
        htmlContent,
        textContent,
        sector,
        city,
        status: 'sending',
        leadIds: leads.map(l => l._id),
        sentCount: 0,
        failedCount: 0,
        createdBy: userId,
      })

      // Send emails asynchronously (non-blocking)
      sendCampaignEmails(campaign._id.toString(), leads.map(l => ({ _id: l._id, companyName: l.companyName, contactName: l.contactName, email: l.email })), subject, htmlContent, textContent)

      return NextResponse.json({
        campaign,
        message: `Campagne en cours d'envoi vers ${leads.length} prospect(s)`,
      }, { status: 201 })
    }

    // Just save as draft
    const campaign = await Campaign.create({
      name,
      subject,
      htmlContent,
      textContent,
      sector,
      city,
      status: 'draft',
      createdBy: userId,
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Accès non autorisé') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[CAMPAIGNS API POST]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function sendCampaignEmails(
  campaignId: string,
  leads: Array<{ _id: any; companyName: string; contactName?: string; email: string }>,
  subject: string,
  htmlContent: string,
  textContent?: string
) {
  const brand = CORPORATE_BRAND
  let sent = 0
  let failed = 0

  for (const lead of leads) {
    try {
      const personalizedHtml = htmlContent
        .replace(/\{\{companyName\}\}/g, lead.companyName)
        .replace(/\{\{contactName\}\}/g, lead.contactName || lead.companyName)
        .replace(/\{\{siteUrl\}\}/g, brand.url)
        .replace(/\{\{whatsapp\}\}/g, brand.whatsapp)
        .replace(/\{\{contactEmail\}\}/g, brand.contactEmail)

      const personalizedText = textContent
        ? textContent
            .replace(/\{\{companyName\}\}/g, lead.companyName)
            .replace(/\{\{contactName\}\}/g, lead.contactName || lead.companyName)
            .replace(/\{\{siteUrl\}\}/g, brand.url)
        : undefined

      const ok = await emailService.sendEmail({
        to: lead.email,
        subject: subject.replace(/\{\{companyName\}\}/g, lead.companyName),
        html: personalizedHtml,
        text: personalizedText,
        fromName: brand.name,
      })

      if (ok) {
        sent++
        await Lead.findByIdAndUpdate(lead._id, {
          status: 'contacted',
          lastContactedAt: new Date(),
        })
      } else {
        failed++
      }
    } catch {
      failed++
    }
    // Small delay to avoid overwhelming SMTP
    await new Promise(r => setTimeout(r, 200))
  }

  await Campaign.findByIdAndUpdate(campaignId, {
    status: 'sent',
    sentCount: sent,
    failedCount: failed,
    sentAt: new Date(),
  })
}

export async function DELETE(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    await Campaign.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Accès non autorisé') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[CAMPAIGNS API DELETE]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
