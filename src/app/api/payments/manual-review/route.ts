import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Payment from '@/lib/models/Payment'
import TopupPayment from '@/lib/models/TopupPayment'
import {
  verifyReviewToken,
  reviewManualPayment,
  providerLabel,
} from '@/lib/payments/manual-review'

/**
 * GET/POST /api/payments/manual-review?token=<signé>
 *
 * Lien envoyé à l'admin quand un paiement manuel (Wave pay-link, OM, Free)
 * ne peut pas être vérifié par API. Le token HMAC remplace la session admin.
 *
 * - GET  → page de décision (récap + boutons Confirmer / Décliner). Aucun effet
 *          de bord : les scanners d'emails peuvent préfetcher sans rien déclencher.
 * - POST → exécute la décision (form-urlencoded : token + action + note?).
 */

function html(body: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vérification paiement — DDM+</title><style>
      body{font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#f1f5f9;display:flex;justify-content:center;padding:24px;margin:0}
      .card{background:#fff;border-radius:16px;max-width:480px;width:100%;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,.08);height:fit-content}
      h1{font-size:19px;margin:0 0 4px;color:#0f172a}
      .sub{color:#64748b;font-size:13px;margin:0 0 20px}
      table{width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:20px}
      td{padding:9px 12px;font-size:13px;border-bottom:1px solid #e2e8f0}
      td:first-child{color:#64748b;width:42%}
      td:last-child{font-weight:600;color:#0f172a}
      .btn{display:block;width:100%;padding:13px;border:0;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:10px}
      .ok{background:#059669;color:#fff}.ko{background:#fff;color:#dc2626;border:2px solid #fecaca}
      .note{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:8px;padding:9px;font-size:13px;margin-bottom:14px;font-family:inherit}
      .warn{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;font-size:12px;color:#92400e;margin-bottom:18px}
    </style></head><body><div class="card">${body}</div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

const esc = (s: unknown) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!))

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || ''
  const verified = verifyReviewToken(token)
  if (!verified) {
    return html('<h1>Lien invalide ou expiré</h1><p class="sub">Ce lien de vérification n\'est plus valide. Connectez-vous au tableau de bord admin pour traiter le paiement.</p>')
  }

  await connectMongoose()
  const doc: any = verified.kind === 'payment'
    ? await Payment.findById(verified.id).lean()
    : await TopupPayment.findById(verified.id).lean()
  if (!doc) return html('<h1>Paiement introuvable</h1><p class="sub">Cette demande n\'existe plus.</p>')

  const amount = verified.kind === 'topup' ? doc.amountFcfa : doc.amount
  const reference = doc.orderId || doc.externalId || String(doc._id)

  if (doc.status !== 'pending') {
    return html(`<h1>Déjà traité</h1><p class="sub">Ce paiement a déjà été traité — statut actuel : <strong>${esc(doc.status)}</strong>.</p>`)
  }

  const row = (l: string, v: string) => `<tr><td>${l}</td><td>${esc(v)}</td></tr>`
  return html(`
    <h1>Vérifier la réception du paiement</h1>
    <p class="sub">Vérifiez le compte marchand ${esc(providerLabel(doc.provider))} avant de décider.</p>
    <div class="warn">⚠️ Ne confirmez que si le montant exact figure sur le relevé ${esc(providerLabel(doc.provider))}.</div>
    <table>
      ${row('Référence', String(reference))}
      ${row('Montant attendu', `${(amount || 0).toLocaleString('fr-FR')} FCFA`)}
      ${row('Moyen', providerLabel(doc.provider))}
      ${row('Demandé le', doc.createdAt ? new Date(doc.createdAt).toLocaleString('fr-FR') : '—')}
    </table>
    <form method="POST" action="/api/payments/manual-review">
      <input type="hidden" name="token" value="${esc(token)}">
      <input type="hidden" name="action" value="confirm">
      <button class="btn ok" type="submit">✓ Confirmer — paiement bien reçu</button>
    </form>
    <form method="POST" action="/api/payments/manual-review">
      <input type="hidden" name="token" value="${esc(token)}">
      <input type="hidden" name="action" value="reject">
      <input class="note" name="note" placeholder="Motif du refus (optionnel)">
      <button class="btn ko" type="submit">✗ Décliner — non reçu</button>
    </form>`)
}

export async function POST(request: NextRequest) {
  // Form HTML → application/x-www-form-urlencoded ; fetch → JSON
  const contentType = request.headers.get('content-type') || ''
  let token = '', action = '', note = ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await request.formData()
    token = String(form.get('token') || '')
    action = String(form.get('action') || '')
    note = String(form.get('note') || '')
  } else {
    const body = await request.json().catch(() => ({}))
    token = body.token || ''
    action = body.action || ''
    note = body.note || ''
  }

  const verified = verifyReviewToken(token)
  if (!verified) {
    return html('<h1>Lien invalide ou expiré</h1><p class="sub">Impossible de traiter cette demande.</p>')
  }
  if (!['confirm', 'reject'].includes(action)) {
    return html('<h1>Action invalide</h1>')
  }

  await connectMongoose()
  const result = await reviewManualPayment({
    kind: verified.kind,
    id: verified.id,
    action: action as 'confirm' | 'reject',
    note: note || undefined,
    actor: 'email-link',
  })

  if (!result.ok) {
    return html(`<h1>Non appliqué</h1><p class="sub">${esc(result.error)}</p>`)
  }

  return html(action === 'confirm'
    ? '<h1>✓ Paiement confirmé</h1><p class="sub">Le client est notifié et sa commande passe en traitement.</p>'
    : '<h1>Paiement décliné</h1><p class="sub">Le client est informé de l\'échec et invité à réessayer ou à contacter le support.</p>')
}
