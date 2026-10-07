import AdminInvoice from '@/lib/models/AdminInvoice'
import { emailService } from '@/lib/email-service'
import { CORPORATE_BRAND, type BrandConfig } from '@/lib/branding'
import { getClientEmailRecipients } from '@/lib/client-contacts'
import { escapeHtml as esc } from '@/lib/html-escape'
import { renderInvoicePdf } from '@/lib/pdf-documents'
import { invoiceBalance } from '@/lib/finance/billing'
import { companyBankDetails, bankDetailsLines } from '@/lib/finance/bank-details'
import { notifyCompany } from '@/lib/portal/company-notify'

export type ReminderLevel = 'due_soon' | 'overdue_1' | 'overdue_15' | 'overdue_30' | 'manual'

const DAY = 24 * 60 * 60 * 1000
const fmt = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} FCFA`

const INTRO: Record<ReminderLevel, string> = {
  due_soon: 'Nous vous rappelons que la facture ci-dessous arrive à échéance dans quelques jours.',
  overdue_1: "Sauf erreur de notre part, la facture ci-dessous n'a pas encore été réglée à son échéance.",
  overdue_15: 'La facture ci-dessous présente un retard de paiement de plus de 15 jours. Merci de procéder à son règlement.',
  overdue_30: 'Malgré nos précédents rappels, la facture ci-dessous reste impayée depuis plus de 30 jours. Merci de régulariser sans délai ou de nous contacter.',
  manual: 'Nous vous rappelons que la facture ci-dessous reste à régler.',
}

/** Niveau de relance dû pour une facture ouverte (null si rien à envoyer aujourd'hui). */
export function reminderLevelFor(inv: any, now = new Date()): ReminderLevel | null {
  if (!inv.dueDate) return null
  const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / DAY)
  const sent = new Set((inv.reminders || []).map((r: any) => r.level))
  const level: ReminderLevel | null =
    days >= 30 ? 'overdue_30' : days >= 15 ? 'overdue_15' : days >= 1 ? 'overdue_1' : days >= -3 && days <= -1 ? 'due_soon' : null
  return level && !sent.has(level) ? level : null
}

/** Envoie la relance (PDF joint, reste dû) au client et l'enregistre sur la facture. */
export async function sendInvoiceReminder(inv: any, level: ReminderLevel, brand: BrandConfig = CORPORATE_BRAND) {
  const recipient = inv.clientCompanyId
    ? await getClientEmailRecipients(String(inv.clientCompanyId), String(inv.client?.email || ''))
    : String(inv.client?.email || '').trim()
  if (!recipient) return { sent: false, reason: 'Aucun email client' }

  const balance = invoiceBalance(inv)
  if (balance <= 0) return { sent: false, reason: 'Facture soldée' }

  const bank = companyBankDetails()
  const bankHtml = bank
    ? `<p style="margin-top:16px"><strong>Règlement par virement bancaire</strong><br>${bankDetailsLines(bank, inv.numero).map(esc).join('<br>')}</p>`
    : ''

  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <p>Bonjour,</p>
    <p>${INTRO[level]}</p>
    <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:4px 12px 4px 0;color:#666">Facture</td><td><strong>${esc(inv.numero)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Échéance</td><td>${new Date(inv.dueDate).toLocaleDateString('fr-FR')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Reste à régler</td><td><strong>${fmt(balance)}</strong></td></tr>
    </table>
    ${bankHtml}
    <p>Vous pouvez consulter et télécharger vos factures depuis votre espace client :
      <a href="${brand.url}/portail-entreprise/documents">${brand.url}/portail-entreprise/documents</a></p>
    <p>Si le règlement a déjà été effectué, merci de ne pas tenir compte de ce message.</p>
    <p>Cordialement,<br>${esc(brand.name)}</p>
  </div>`

  const delivery = await emailService.sendEmailDetailed({
    to: recipient,
    fromName: brand.name,
    brand,
    subject: `${level === 'due_soon' ? 'Rappel' : 'Relance'} — Facture ${inv.numero} (${fmt(balance)})`,
    html,
    attachments: [{ filename: `Facture-${inv.numero}.pdf`, content: renderInvoicePdf(inv), contentType: 'application/pdf' }],
  })
  if (delivery.status === 'simulated') return { sent: false, reason: "Serveur d'envoi d'emails non configuré : la relance n'est pas partie" }
  if (!delivery.ok) return { sent: false, reason: "Échec de l'envoi" }

  await AdminInvoice.updateOne({ _id: inv._id }, { $push: { reminders: { level, sentAt: new Date(), to: recipient } } })
  if (inv.clientCompanyId) {
    await notifyCompany({
      companyId: inv.clientCompanyId,
      category: 'invoice',
      type: level === 'due_soon' ? 'info' : 'warning',
      requires: 'finance:view',
      title: level === 'due_soon' ? `Facture ${inv.numero} bientôt à échéance` : `Facture ${inv.numero} en attente de règlement`,
      message: `Reste à régler : ${fmt(balance)}.`,
      actionUrl: `/portail-entreprise/documents/factures/${String(inv._id)}`,
      metadata: { invoiceId: String(inv._id), level },
    })
  }
  return { sent: true, to: recipient, copyTo: delivery.bcc }
}
