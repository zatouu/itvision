import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, requireCompanyCapability, companyScope } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'
import { addNotification } from '@/lib/notifications-memory'
import { emailService } from '@/lib/email-service'
import { CORPORATE_BRAND } from '@/lib/branding'

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result

  const denied = requireCompanyCapability(access, 'interventions:feedback')
  if (denied) return denied

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  const body = await request.json().catch(() => null)
  const rating = Number(body?.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Note requise (1 à 5)' }, { status: 400 })
  }
  const comment = typeof body?.comment === 'string' ? body.comment.trim().slice(0, 1000) : ''
  const tags = Array.isArray(body?.tags)
    ? [...new Set(body.tags.filter((t: unknown) => typeof t === 'string').map((t: string) => t.slice(0, 40)))].slice(0, 8) as string[]
    : []

  await connectDB()
  const userId = new mongoose.Types.ObjectId(access.userId)
  const companyId = access.profiles.companyClientId

  const intervention = await Intervention.findOne({
    _id: new mongoose.Types.ObjectId(id),
    ...companyScope({ userId, companyId })
  }).select('title interventionNumber status').lean() as any

  if (!intervention) {
    return NextResponse.json({ error: 'Intervention introuvable' }, { status: 404 })
  }
  if (intervention.status !== 'completed') {
    return NextResponse.json({ error: 'Avis possible une fois l’intervention terminée' }, { status: 400 })
  }

  await Intervention.updateOne(
    { _id: intervention._id },
    { $set: { clientFeedback: { rating, comment, tags, userId, submittedAt: new Date() } } }
  )

  // Avis négatif : l'équipe IT Vision est alertée pour rappeler le client
  if (rating <= 3) {
    const label = intervention.interventionNumber || intervention.title || 'Intervention'
    addNotification({
      userId: 'admin', type: 'warning',
      title: `Avis client ${rating}/5 : ${label}`,
      message: [tags.join(', '), comment].filter(Boolean).join(' - ').slice(0, 200) || 'Aucun commentaire',
      actionUrl: '/admin/satisfaction',
      metadata: { interventionId: String(intervention._id), event: 'low_rating' },
    } as any)
    emailService.sendEmail({
      to: CORPORATE_BRAND.contactEmail,
      subject: `Avis client ${rating}/5 - ${label}`,
      html: `<p>Un client a noté l'intervention <strong>${esc(String(label))}</strong> ${rating}/5.</p>
        ${tags.length ? `<p>Points signalés : ${esc(tags.join(', '))}</p>` : ''}
        ${comment ? `<p>Commentaire : ${esc(comment).replace(/\n/g, '<br>')}</p>` : ''}
        <p>Pensez à le rappeler rapidement.</p>`,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, message: 'Avis enregistré' })
}
