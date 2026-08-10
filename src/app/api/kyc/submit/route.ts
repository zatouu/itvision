import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import { emailService } from '@/lib/email-service'
import KycRequest from '@/lib/models/KycRequest'
import User from '@/lib/models/User'
import { getBrandFromHost } from '@/lib/branding'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'contact@itvisionplus.sn'
const MIN_RESUBMIT_MS = 60_000

function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  const v = value.trim()
  if (/^https?:\/\//i.test(v)) return true
  if (v.startsWith('/uploads/')) return true
  if (v.startsWith('/api/uploads/')) return true
  return false
}

function normalizeUploadUrl(value: string): string {
  const v = value.trim()
  // /api/uploads/ est le seul endpoint garanti en production standalone
  if (v.startsWith('/uploads/')) return v.replace('/uploads/', '/api/uploads/')
  return v
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const brand = getBrandFromHost(request.nextUrl.host)
    const { userId } = await requireAuth(request)
    const body = await request.json()
    const { idCardFrontUrl, idCardBackUrl, selfieUrl, trade, fullName } = body

    if (!idCardFrontUrl || !selfieUrl || !trade || !fullName) {
      return NextResponse.json(
        { error: 'Photo CNI recto, selfie, métier et nom complet requis' },
        { status: 400 }
      )
    }

    // Validation texte
    const name = String(fullName).trim()
    const job = String(trade).trim()
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: 'Le nom complet doit faire entre 2 et 100 caractères' }, { status: 400 })
    }
    if (job.length < 2 || job.length > 100) {
      return NextResponse.json({ error: 'Le métier doit faire entre 2 et 100 caractères' }, { status: 400 })
    }

    // Validation documents (doivent venir de notre stockage)
    if (!isValidUrl(idCardFrontUrl)) {
      return NextResponse.json({ error: 'Document CNI recto invalide' }, { status: 400 })
    }
    if (!isValidUrl(selfieUrl)) {
      return NextResponse.json({ error: 'Selfie invalide' }, { status: 400 })
    }
    if (idCardBackUrl && !isValidUrl(idCardBackUrl)) {
      return NextResponse.json({ error: 'Document CNI verso invalide' }, { status: 400 })
    }

    // Upsert : si déjà soumis, on met à jour (sauf si déjà approuvé)
    const existing = await KycRequest.findOne({ providerId: userId })
    if (existing?.status === 'approved') {
      return NextResponse.json({ error: 'KYC déjà validé' }, { status: 400 })
    }

    // Anti-spam : empêche les resoumissions multiples en quelques secondes
    if (existing?.status === 'pending' && existing?.createdAt) {
      const elapsed = Date.now() - new Date(existing.createdAt).getTime()
      if (elapsed < MIN_RESUBMIT_MS) {
        return NextResponse.json(
          { error: 'Veuillez patienter une minute avant de renvoyer votre KYC' },
          { status: 429 }
        )
      }
    }

    const frontUrl = normalizeUploadUrl(idCardFrontUrl)
    const backUrl = idCardBackUrl ? normalizeUploadUrl(idCardBackUrl) : ''
    const selfieNormUrl = normalizeUploadUrl(selfieUrl)

    const kyc = await KycRequest.findOneAndUpdate(
      { providerId: userId },
      {
        idCardFrontUrl: frontUrl,
        idCardBackUrl: backUrl,
        selfieUrl: selfieNormUrl,
        trade: job,
        fullName: name,
        status: 'pending',
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    // Notifier l'admin par email (fire-and-forget)
    try {
      const user = await User.findById(userId).select('phone email name').lean()
      const baseUrl = brand.url
      const absolute = (u: string) => (u.startsWith('http') ? u : `${baseUrl}${u}`)
      const adminLink = `${baseUrl}/admin/kyc`

      void emailService.sendEmail({
        to: ADMIN_EMAIL || brand.contactEmail,
        fromName: brand.name,
        brand,
        subject: `🆔 Nouvelle soumission KYC - ${name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
            <h2 style="color:#2563EB">Nouvelle soumission KYC</h2>
            <p><strong>Prestataire :</strong> ${name}</p>
            <p><strong>Métier :</strong> ${job}</p>
            <p><strong>Téléphone :</strong> ${user?.phone || 'N/A'}</p>
            <p><strong>Email :</strong> ${user?.email || 'N/A'}</p>
            <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
            <h3 style="margin-top:24px">Documents</h3>
            <ul>
              <li><a href="${absolute(frontUrl)}">CNI recto</a></li>
              ${backUrl ? `<li><a href="${absolute(backUrl)}">CNI verso</a></li>` : ''}
              <li><a href="${absolute(selfieNormUrl)}">Selfie</a></li>
            </ul>
            <p style="margin-top:24px">
              <a href="${adminLink}" style="display:inline-block;background:#2563EB;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px">
                Vérifier dans l'admin
              </a>
            </p>
          </div>
        `,
        text: `Nouvelle soumission KYC de ${name} (${job}). Téléphone: ${user?.phone || 'N/A'}. Vérifier: ${adminLink}`,
      })
    } catch (emailErr) {
      console.error('[KYC] Erreur envoi email admin:', emailErr)
    }

    return NextResponse.json({ success: true, kyc })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/kyc/submit]', e)
    return NextResponse.json({ error: 'Erreur soumission KYC' }, { status: 500 })
  }
}
