/**
 * Service de notifications pour les achats groupés
 * Gère l'envoi d'emails aux participants
 */

import { emailService } from './email-service'

interface GroupOrderData {
  groupId: string
  product: {
    name: string
    image?: string
    basePrice: number
    currency: string
  }
  currentQty: number
  targetQty: number
  currentUnitPrice: number
  deadline: Date | string
  shippingMethod?: string
}

interface ParticipantData {
  name: string
  email?: string
  phone: string
  qty: number
  unitPrice: number
  totalAmount: number
}

const formatCurrency = (amount: number, currency = 'FCFA') => 
  `${amount.toLocaleString('fr-FR')} ${currency}`

const formatDate = (date: Date | string) => 
  new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// ─────────────────────────────────────────────────────────────────────────────
// Templates d'emails
// ─────────────────────────────────────────────────────────────────────────────

const baseStyles = `
  body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: white; }
  .header { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .header p { margin: 10px 0 0; opacity: 0.9; }
  .content { padding: 30px; }
  .product-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; display: flex; gap: 15px; }
  .product-image { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; background: #e2e8f0; }
  .product-info h3 { margin: 0 0 5px; color: #1e293b; }
  .product-info p { margin: 0; color: #64748b; font-size: 14px; }
  .stats { display: flex; gap: 15px; margin: 20px 0; }
  .stat-box { flex: 1; background: #f1f5f9; border-radius: 8px; padding: 15px; text-align: center; }
  .stat-box .value { font-size: 24px; font-weight: bold; color: #7c3aed; }
  .stat-box .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
  .progress-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin: 15px 0; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #10b981 0%, #059669 100%); border-radius: 4px; }
  .button { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 15px 0; }
  .button:hover { opacity: 0.9; }
  .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
  .success-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
  .warning-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
  .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; }
  .footer a { color: #7c3aed; text-decoration: none; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  table th, table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  table th { background: #f8fafc; font-weight: 600; color: #475569; }
`

function wrapEmailTemplate(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - IT Vision Plus</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        ${content}
        <div class="footer">
          <p>© ${new Date().getFullYear()} IT Vision Plus - Votre partenaire sécurité</p>
          <p><a href="${siteUrl}">www.itvisionplus.com</a> | <a href="tel:+221338000000">+221 33 800 00 00</a></p>
        </div>
      </div>
    </body>
    </html>
  `
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions de notification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notification: Confirmation d'inscription à un achat groupé
 */
export async function notifyGroupJoinConfirmation(
  participant: ParticipantData,
  group: GroupOrderData
): Promise<boolean> {
  if (!participant.email) {
    console.log(`[NOTIF] Pas d'email pour ${participant.name}, notification ignorée`)
    return false
  }

  const progress = Math.min(100, Math.round((group.currentQty / group.targetQty) * 100))
  const savings = group.product.basePrice - group.currentUnitPrice
  const savingsPercent = Math.round((savings / group.product.basePrice) * 100)

  const content = `
    <div class="header">
      <h1>🎉 Inscription confirmée !</h1>
      <p>Achat Groupé #${group.groupId}</p>
    </div>
    <div class="content">
      <p>Bonjour <strong>${participant.name}</strong>,</p>
      <p>Votre inscription à l'achat groupé a été enregistrée avec succès !</p>
      
      <div class="product-card">
        ${group.product.image ? `<img src="${group.product.image}" alt="${group.product.name}" class="product-image">` : ''}
        <div class="product-info">
          <h3>${group.product.name}</h3>
          <p>Prix de base: ${formatCurrency(group.product.basePrice, group.product.currency)}</p>
        </div>
      </div>

      <div class="success-box">
        <strong>Votre commande:</strong><br>
        Quantité: <strong>${participant.qty} unité(s)</strong><br>
        Prix unitaire: <strong>${formatCurrency(participant.unitPrice, group.product.currency)}</strong>
        ${savingsPercent > 0 ? `<span style="color: #10b981; margin-left: 10px;">(-${savingsPercent}%)</span>` : ''}<br>
        Total: <strong>${formatCurrency(participant.totalAmount, group.product.currency)}</strong>
      </div>

      <h3>Progression du groupe</h3>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
      <p style="text-align: center; color: #64748b;">
        <strong>${group.currentQty}</strong> / ${group.targetQty} unités réservées (${progress}%)
      </p>

      <div class="stats">
        <div class="stat-box">
          <div class="value">${formatCurrency(group.currentUnitPrice, group.product.currency)}</div>
          <div class="label">Prix actuel</div>
        </div>
        <div class="stat-box">
          <div class="value">${formatDate(group.deadline)}</div>
          <div class="label">Date limite</div>
        </div>
      </div>

      <div class="info-box">
        <strong>Prochaines étapes:</strong><br>
        1. Invitez vos contacts pour débloquer un meilleur prix<br>
        2. Nous vous contacterons pour le paiement une fois l'objectif atteint<br>
        3. Livraison groupée à Dakar
      </div>

      <div style="text-align: center;">
        <a href="${siteUrl}/achats-groupes/${group.groupId}" class="button">
          Voir l'achat groupé
        </a>
      </div>
    </div>
  `

  return emailService.sendEmail({
    to: participant.email,
    subject: `✅ Inscription confirmée - Achat Groupé ${group.product.name}`,
    html: wrapEmailTemplate(content, 'Inscription confirmée')
  })
}

/**
 * Notification: Un nouveau participant a rejoint (pour tous les participants)
 */
export async function notifyNewParticipant(
  participants: ParticipantData[],
  newParticipant: ParticipantData,
  group: GroupOrderData
): Promise<void> {
  const progress = Math.min(100, Math.round((group.currentQty / group.targetQty) * 100))

  for (const participant of participants) {
    if (!participant.email || participant.phone === newParticipant.phone) continue

    const content = `
      <div class="header">
        <h1>👥 Nouveau participant !</h1>
        <p>Achat Groupé #${group.groupId}</p>
      </div>
      <div class="content">
        <p>Bonjour <strong>${participant.name}</strong>,</p>
        <p>Bonne nouvelle ! <strong>${newParticipant.name}</strong> vient de rejoindre l'achat groupé pour <strong>${newParticipant.qty} unité(s)</strong>.</p>
        
        <div class="product-card">
          <div class="product-info">
            <h3>${group.product.name}</h3>
            <p>Progression: ${group.currentQty} / ${group.targetQty} unités</p>
          </div>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <p style="text-align: center; color: #64748b;">
          Plus que <strong>${Math.max(0, group.targetQty - group.currentQty)}</strong> unités pour atteindre l'objectif !
        </p>

        ${group.currentUnitPrice < group.product.basePrice ? `
          <div class="success-box">
            <strong>🎉 Le prix a baissé !</strong><br>
            Nouveau prix unitaire: <strong>${formatCurrency(group.currentUnitPrice, group.product.currency)}</strong>
          </div>
        ` : ''}

        <div style="text-align: center;">
          <a href="${siteUrl}/achats-groupes/${group.groupId}" class="button">
            Voir les détails
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b;">
          💡 Partagez ce lien pour inviter plus de participants et débloquer un meilleur prix !
        </p>
      </div>
    `

    await emailService.sendEmail({
      to: participant.email,
      subject: `👥 ${newParticipant.name} a rejoint l'achat groupé - ${group.product.name}`,
      html: wrapEmailTemplate(content, 'Nouveau participant')
    })
  }
}

/**
 * Notification: Objectif atteint !
 */
export async function notifyObjectiveReached(
  participants: ParticipantData[],
  group: GroupOrderData
): Promise<void> {
  const savings = group.product.basePrice - group.currentUnitPrice
  const savingsPercent = Math.round((savings / group.product.basePrice) * 100)

  for (const participant of participants) {
    if (!participant.email) continue

    const content = `
      <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <h1>🎯 Objectif atteint !</h1>
        <p>Achat Groupé #${group.groupId}</p>
      </div>
      <div class="content">
        <p>Bonjour <strong>${participant.name}</strong>,</p>
        <p>Excellente nouvelle ! L'achat groupé a atteint son objectif de <strong>${group.targetQty} unités</strong> !</p>
        
        <div class="success-box">
          <strong>🎉 Résumé de votre économie:</strong><br>
          Prix de base: <span style="text-decoration: line-through; color: #94a3b8;">${formatCurrency(group.product.basePrice, group.product.currency)}</span><br>
          Prix final: <strong style="color: #10b981;">${formatCurrency(group.currentUnitPrice, group.product.currency)}</strong>
          <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; margin-left: 10px;">-${savingsPercent}%</span><br><br>
          Votre total: <strong>${formatCurrency(participant.totalAmount, group.product.currency)}</strong> pour ${participant.qty} unité(s)
        </div>

        <h3>Prochaines étapes</h3>
        <table>
          <tr>
            <td style="width: 30px;">1️⃣</td>
            <td><strong>Paiement</strong> - Nous vous contacterons sous 48h pour finaliser le paiement</td>
          </tr>
          <tr>
            <td>2️⃣</td>
            <td><strong>Commande</strong> - Dès réception des paiements, nous passons commande</td>
          </tr>
          <tr>
            <td>3️⃣</td>
            <td><strong>Livraison</strong> - Livraison groupée à Dakar (délai selon mode choisi)</td>
          </tr>
        </table>

        <div class="info-box">
          <strong>Contact:</strong> Un conseiller vous appellera au <strong>${participant.phone}</strong> pour organiser le paiement.
        </div>

        <div style="text-align: center;">
          <a href="${siteUrl}/achats-groupes/${group.groupId}" class="button">
            Voir l'achat groupé
          </a>
        </div>
      </div>
    `

    await emailService.sendEmail({
      to: participant.email,
      subject: `🎯 Objectif atteint ! Achat Groupé ${group.product.name}`,
      html: wrapEmailTemplate(content, 'Objectif atteint')
    })
  }
}

/**
 * Notification: Mise à jour du statut
 */
export async function notifyStatusUpdate(
  participants: ParticipantData[],
  group: GroupOrderData,
  newStatus: string,
  additionalInfo?: string
): Promise<void> {
  const statusMessages: Record<string, { emoji: string; title: string; message: string }> = {
    ordering: {
      emoji: '🛒',
      title: 'Commande en cours',
      message: 'Nous passons commande auprès de notre fournisseur. Vous recevrez une confirmation dès que la commande sera validée.'
    },
    ordered: {
      emoji: '✅',
      title: 'Commande confirmée',
      message: 'La commande a été validée par notre fournisseur. La production/préparation est en cours.'
    },
    shipped: {
      emoji: '🚢',
      title: 'En cours d\'expédition',
      message: 'Votre commande est en route ! Vous serez notifié dès son arrivée à Dakar.'
    },
    delivered: {
      emoji: '📦',
      title: 'Livré !',
      message: 'Votre commande est arrivée ! Contactez-nous pour organiser la récupération de vos produits.'
    },
    cancelled: {
      emoji: '❌',
      title: 'Achat groupé annulé',
      message: 'Malheureusement, cet achat groupé a été annulé. Si vous avez effectué un paiement, vous serez remboursé sous 7 jours.'
    }
  }

  const statusInfo = statusMessages[newStatus]
  if (!statusInfo) return

  for (const participant of participants) {
    if (!participant.email) continue

    const content = `
      <div class="header" style="${newStatus === 'cancelled' ? 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);' : ''}">
        <h1>${statusInfo.emoji} ${statusInfo.title}</h1>
        <p>Achat Groupé #${group.groupId}</p>
      </div>
      <div class="content">
        <p>Bonjour <strong>${participant.name}</strong>,</p>
        
        <div class="${newStatus === 'cancelled' ? 'warning-box' : 'info-box'}">
          <strong>Mise à jour de votre achat groupé:</strong><br>
          ${statusInfo.message}
          ${additionalInfo ? `<br><br>${additionalInfo}` : ''}
        </div>

        <div class="product-card">
          <div class="product-info">
            <h3>${group.product.name}</h3>
            <p>Votre commande: ${participant.qty} unité(s) - ${formatCurrency(participant.totalAmount, group.product.currency)}</p>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${siteUrl}/achats-groupes/${group.groupId}" class="button">
            Suivre ma commande
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b; text-align: center;">
          Des questions ? Répondez à cet email ou appelez-nous au +221 33 800 00 00
        </p>
      </div>
    `

    await emailService.sendEmail({
      to: participant.email,
      subject: `${statusInfo.emoji} ${statusInfo.title} - Achat Groupé ${group.product.name}`,
      html: wrapEmailTemplate(content, statusInfo.title)
    })
  }
}

/**
 * Notification: Rappel avant deadline
 */
export async function notifyDeadlineReminder(
  participants: ParticipantData[],
  group: GroupOrderData,
  daysLeft: number
): Promise<void> {
  const progress = Math.min(100, Math.round((group.currentQty / group.targetQty) * 100))
  const remaining = group.targetQty - group.currentQty

  for (const participant of participants) {
    if (!participant.email) continue

    const content = `
      <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
        <h1>⏰ Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} !</h1>
        <p>Achat Groupé #${group.groupId}</p>
      </div>
      <div class="content">
        <p>Bonjour <strong>${participant.name}</strong>,</p>
        <p>L'achat groupé pour <strong>${group.product.name}</strong> se termine bientôt !</p>
        
        <div class="warning-box">
          <strong>⏳ Date limite: ${formatDate(group.deadline)}</strong><br>
          ${remaining > 0 
            ? `Il manque encore <strong>${remaining} unité(s)</strong> pour atteindre l'objectif.`
            : `L'objectif est atteint ! Plus de participants = meilleur prix !`
          }
        </div>

        <h3>Progression actuelle</h3>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <p style="text-align: center; color: #64748b;">
          <strong>${group.currentQty}</strong> / ${group.targetQty} unités (${progress}%)
        </p>

        <div class="info-box">
          <strong>💡 Partagez pour économiser plus !</strong><br>
          Invitez vos contacts à rejoindre le groupe pour débloquer un meilleur prix.
        </div>

        <div style="text-align: center;">
          <a href="${siteUrl}/achats-groupes/${group.groupId}" class="button">
            Partager l'achat groupé
          </a>
        </div>
      </div>
    `

    await emailService.sendEmail({
      to: participant.email,
      subject: `⏰ Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} - Achat Groupé ${group.product.name}`,
      html: wrapEmailTemplate(content, 'Rappel deadline')
    })
  }
}

/**
 * Notification: Demande de paiement après objectif atteint
 */
export async function notifyPaymentRequest(
  participant: ParticipantData,
  group: GroupOrderData,
  paymentInfo: {
    reference: string
    wavePhone: string
    orangePhone: string
  }
): Promise<boolean> {
  if (!participant.email) {
    console.log(`[NOTIF] Pas d'email pour ${participant.name}, notification de paiement ignorée`)
    return false
  }

  const content = `
    <div class="header" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
      <h1>💰 Demande de paiement</h1>
      <p>L'objectif est atteint - Finalisez votre commande !</p>
    </div>
    
    <div class="content">
      <p>Bonjour <strong>${participant.name}</strong>,</p>
      
      <p>Excellente nouvelle ! L'objectif de l'achat groupé pour <strong>${group.product.name}</strong> a été atteint. 🎉</p>
      
      <div class="success-box">
        <strong>✅ L'achat groupé est validé !</strong><br>
        Nous allons procéder à la commande. Merci de régler votre participation.
      </div>
      
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 16px; padding: 25px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">Montant à régler</p>
        <p style="margin: 10px 0; font-size: 36px; font-weight: bold; color: #059669;">
          ${formatCurrency(participant.totalAmount, group.product.currency)}
        </p>
        <p style="margin: 0; color: #64748b; font-size: 14px;">
          ${participant.qty} × ${formatCurrency(participant.unitPrice, group.product.currency)}
        </p>
      </div>
      
      <div class="warning-box">
        <strong>⚠️ Référence obligatoire:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${paymentInfo.reference}</code><br>
        <small>Indiquez cette référence dans votre paiement.</small>
      </div>

      <h3>Méthodes de paiement</h3>
      
      <div style="background: #ecfeff; border-left: 4px solid #06b6d4; padding: 15px; margin: 10px 0; border-radius: 0 8px 8px 0;">
        <strong>📱 Wave (Recommandé)</strong><br>
        Numéro: <strong>${paymentInfo.wavePhone}</strong><br>
        Montant: ${formatCurrency(participant.totalAmount, group.product.currency)}<br>
        Note: ${paymentInfo.reference}
      </div>
      
      <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 10px 0; border-radius: 0 8px 8px 0;">
        <strong>📱 Orange Money</strong><br>
        Numéro: <strong>${paymentInfo.orangePhone}</strong><br>
        Composez #144# ou utilisez l'app Orange Money<br>
        Motif: ${paymentInfo.reference}
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${siteUrl}/achats-groupes/${group.groupId}/paiement" class="button" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
          Voir les instructions de paiement
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 14px;">
        Après réception de votre paiement, nous passerons la commande groupée. 
        Vous recevrez un email de confirmation avec le suivi de livraison.
      </p>
    </div>
  `

  try {
    await emailService.sendEmail({
      to: participant.email,
      subject: `💰 Paiement requis - Achat Groupé ${group.product.name}`,
      html: wrapEmailTemplate(content, 'Demande de paiement')
    })
    console.log(`[NOTIF] Demande de paiement envoyée à ${participant.email}`)
    return true
  } catch (error) {
    console.error(`[NOTIF] Erreur envoi demande de paiement:`, error)
    return false
  }
}

export default {
  notifyGroupJoinConfirmation,
  notifyNewParticipant,
  notifyObjectiveReached,
  notifyStatusUpdate,
  notifyDeadlineReminder,
  notifyPaymentRequest
}
