import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import AdminQuote from '@/lib/models/AdminQuote'
import emailService from '@/lib/email-service'
import { notifyQuoteWorkflowEvent } from '@/lib/quote-notifications'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'contact@itvisionplus.sn'

function fmt(v: number) { return Math.round(v).toLocaleString('fr-FR') }

function normalizeQuoteForResponse(quote: any) {
  if (!quote) return quote
  return {
    ...quote,
    products: Array.isArray(quote.products) ? quote.products : [],
    clientComments: Array.isArray(quote.clientComments)
      ? [...quote.clientComments].sort((a: any, b: any) => {
          const at = new Date(a?.createdAt || 0).getTime()
          const bt = new Date(b?.createdAt || 0).getTime()
          return at - bt
        })
      : []
  }
}

function buildAdminNotificationHtml(quote: any, action: string, message: string, counterAmount?: number, clientName?: string) {
  const actionLabel = action === 'accepted' ? 'Accepté' : action === 'rejected' ? 'Refusé' : action === 'counter_proposed' ? 'Contre-proposition' : 'Commentaire'
  const color = action === 'accepted' ? '#16a34a' : action === 'rejected' ? '#dc2626' : '#7c3aed'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}
    .container{max-width:600px;margin:0 auto;padding:20px}
    .header{background:linear-gradient(135deg,#22c55e,#7c3aed);color:white;padding:24px;border-radius:10px 10px 0 0;text-align:center}
    .content{background:#f8f9fa;padding:24px;border-radius:0 0 10px 10px}
    .badge{display:inline-block;padding:6px 16px;border-radius:20px;font-weight:bold;color:white;background:${color}}
    .box{background:white;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb}
    .btn{display:inline-block;background:linear-gradient(135deg,#22c55e,#7c3aed);color:white;padding:12px 24px;text-decoration:none;border-radius:8px;margin:16px 0}
    .footer{text-align:center;font-size:12px;color:#888;margin-top:16px}
  </style></head><body><div class="container">
    <div class="header"><h2>Portail Client — Action sur Devis</h2></div>
    <div class="content">
      <p>Le client <strong>${clientName || 'Inconnu'}</strong> a effectué une action sur le devis <strong>${quote.numero}</strong>.</p>
      <div style="text-align:center;margin:16px 0"><span class="badge">${actionLabel}</span></div>
      <div class="box">
        <strong>Devis :</strong> ${quote.numero} — ${quote.title || 'Devis'}<br>
        <strong>Montant :</strong> ${fmt(quote.total)} FCFA<br>
        ${counterAmount ? `<strong>Contre-proposition :</strong> ${fmt(counterAmount)} FCFA<br>` : ''}
        <strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}
      </div>
      ${message ? `<div class="box"><strong>Message du client :</strong><br><em>${message}</em></div>` : ''}
      <a href="${SITE_URL}/admin" class="btn">Voir dans l'admin</a>
    </div>
    <div class="footer">© ${new Date().getFullYear()} IT Vision Plus</div>
  </div></body></html>`
}

function buildClientConfirmHtml(quote: any, action: string, clientName: string) {
  const actionLabel = action === 'accepted' ? 'accepté' : action === 'rejected' ? 'refusé' : action === 'counter_proposed' ? 'transmis (contre-proposition)' : 'reçu'
  const nextStep = action === 'accepted'
    ? 'Notre équipe va préparer la commande et vous contacter sous 24h pour la suite.'
    : action === 'rejected'
    ? 'Nous prenons note. N\'hésitez pas à nous contacter si vous souhaitez réviser les conditions.'
    : 'Notre équipe analysera votre proposition et reviendra vers vous dans les plus brefs délais.'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}
    .container{max-width:600px;margin:0 auto;padding:20px}
    .header{background:linear-gradient(135deg,#22c55e,#7c3aed);color:white;padding:24px;border-radius:10px 10px 0 0;text-align:center}
    .content{background:#f8f9fa;padding:24px;border-radius:0 0 10px 10px}
    .box{background:white;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb}
    .btn{display:inline-block;background:linear-gradient(135deg,#22c55e,#7c3aed);color:white;padding:12px 24px;text-decoration:none;border-radius:8px;margin:16px 0}
    .footer{text-align:center;font-size:12px;color:#888;margin-top:16px}
  </style></head><body><div class="container">
    <div class="header"><h2>Confirmation — Devis ${quote.numero}</h2></div>
    <div class="content">
      <p>Bonjour <strong>${clientName}</strong>,</p>
      <p>Nous confirmons que votre réponse au devis <strong>${quote.numero}</strong> a bien été <strong>${actionLabel}</strong>.</p>
      <div class="box">
        <strong>Devis :</strong> ${quote.numero} — ${quote.title || 'Devis'}<br>
        <strong>Montant :</strong> ${fmt(quote.total)} FCFA<br>
        <strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}
      </div>
      <p>${nextStep}</p>
      <a href="${SITE_URL}/portail-entreprise/documents" class="btn">Voir mes documents</a>
      <p style="margin-top:16px">📧 contact@itvisionplus.sn &nbsp;|&nbsp; 📱 +221 77 413 34 40</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} IT Vision Plus</div>
  </div></body></html>`
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT' || !auth.user.companyClientId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)
  const companyId = new mongoose.Types.ObjectId(auth.user.companyClientId)

  const quote = await AdminQuote.findOne({
    _id: id,
    $or: [{ clientUserId: userId }, { clientCompanyId: companyId }]
  })

  if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })

  const body = await request.json()
  const { action, message, counterAmount } = body
  const trimmedMessage = typeof message === 'string' ? message.trim() : ''

  if (!['accepted', 'rejected', 'counter_proposed', 'comment'].includes(action)) {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  }

  if (action === 'comment' && !trimmedMessage) {
    return NextResponse.json({ error: 'Le commentaire est requis' }, { status: 400 })
  }

  if (action === 'counter_proposed' && (!counterAmount || Number(counterAmount) <= 0)) {
    return NextResponse.json({ error: 'Le montant de contre-proposition est requis' }, { status: 400 })
  }

  const now = new Date()

  // Mettre à jour le statut du devis
  const setUpdate: any = { clientRespondedAt: now }
  if (action !== 'comment') {
    setUpdate.clientResponse = action
    if (action === 'accepted') {
      setUpdate.status = 'accepted'
      setUpdate.acceptedAt = now
    } else if (action === 'rejected') {
      setUpdate.status = 'rejected'
      setUpdate.rejectedAt = now
    } else if (action === 'counter_proposed') {
      setUpdate.clientCounterAmount = counterAmount
    }
  }

  const pushUpdate = trimmedMessage
    ? {
        clientComments: {
          authorId: userId,
          authorRole: 'CLIENT',
          message: trimmedMessage,
          createdAt: now,
          readByOther: false
        }
      }
    : undefined

  if (trimmedMessage) {
    setUpdate.clientRespondedAt = now
  }

  const mongoUpdate: any = { $set: setUpdate }
  if (pushUpdate) {
    mongoUpdate.$push = pushUpdate
  }

  await AdminQuote.updateOne({ _id: quote._id }, mongoUpdate)

  const updatedQuote = await AdminQuote.findById(quote._id).lean()
  const normalizedQuote = normalizeQuoteForResponse(updatedQuote)

  // Emails
  const clientName = auth.user.name || auth.user.email || 'Client'
  const clientEmail = auth.user.email || quote.client?.email

  await Promise.allSettled([
    // Notifier l'admin
    emailService.sendEmail({
      to: ADMIN_EMAIL,
      subject: `[Portail Client] Devis ${quote.numero} — ${action === 'accepted' ? 'Accepté' : action === 'rejected' ? 'Refusé' : action === 'counter_proposed' ? 'Contre-proposition' : 'Commentaire'} par ${clientName}`,
      html: buildAdminNotificationHtml(quote, action, trimmedMessage, counterAmount, clientName)
    }),
    // Confirmer au client
    clientEmail && action !== 'comment' ? emailService.sendEmail({
      to: clientEmail,
      subject: `Confirmation — Devis ${quote.numero} ${action === 'accepted' ? 'accepté' : action === 'rejected' ? 'refusé' : 'contre-proposition envoyée'}`,
      html: buildClientConfirmHtml(quote, action, clientName)
    }) : Promise.resolve()
  ])

  const eventType =
    action === 'accepted'
      ? 'client_accepted'
      : action === 'rejected'
      ? 'client_rejected'
      : action === 'counter_proposed'
      ? 'client_counter_proposed'
      : 'client_comment'

  await notifyQuoteWorkflowEvent({
    eventType,
    quote: normalizedQuote || quote,
    actorName: clientName,
    message: trimmedMessage,
    counterAmount: Number(counterAmount || 0) || undefined,
    clientUserId: auth.user.id,
    clientCompanyId: auth.user.companyClientId
  })

  return NextResponse.json({ success: true, action, quote: normalizedQuote })
}
