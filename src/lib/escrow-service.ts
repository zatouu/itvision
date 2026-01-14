/**
 * Service de gestion des garanties et suivi transparent
 * Renforce la confiance client avec un système de transparence totale
 */

import { EscrowTransaction, EscrowStatus, escrowStatusLabels } from './models/EscrowTransaction'
import { emailService } from './email-service'
import dbConnect from './mongodb'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// ─────────────────────────────────────────────────────────────────────────────
// Création et gestion des transactions
// ─────────────────────────────────────────────────────────────────────────────

interface CreateEscrowParams {
  userId: string
  client: { name: string; phone: string; email?: string }
  amount: number
  groupOrderId?: string
  orderId?: string
}

/**
 * Créer une nouvelle transaction avec garanties
 */
export async function createEscrowTransaction(params: CreateEscrowParams) {
  await dbConnect()
  
  // Générer référence unique
  const reference = `GAR-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  
  const transaction = new EscrowTransaction({
    reference,
    userId: params.userId,
    client: params.client,
    amount: params.amount,
    currency: 'FCFA',
    groupOrderId: params.groupOrderId,
    orderId: params.orderId,
    status: 'pending_payment',
    timeline: [{
      status: 'pending_payment',
      timestamp: new Date(),
      note: 'Transaction créée',
      notifiedClient: false
    }]
  })
  
  // Ajouter les garanties par défaut
  transaction.setDefaultGuarantees()
  
  await transaction.save()
  
  return transaction
}

/**
 * Mettre à jour le statut et notifier le client
 */
export async function updateEscrowStatus(
  reference: string,
  newStatus: EscrowStatus,
  options: {
    note?: string
    adminId?: string
    notifyClient?: boolean
    deliveryInfo?: {
      trackingNumber?: string
      carrier?: string
      estimatedDate?: Date
    }
  } = {}
) {
  await dbConnect()
  
  const transaction = await EscrowTransaction.findOne({ reference })
  if (!transaction) {
    throw new Error(`Transaction ${reference} non trouvée`)
  }
  
  const previousStatus = transaction.status
  
  // Ajouter l'événement au timeline
  transaction.addEvent(newStatus, options.note, options.adminId)
  
  // Mettre à jour les dates clés
  const now = new Date()
  switch (newStatus) {
    case 'payment_received':
      transaction.paymentReceivedAt = now
      transaction.paidAmount = transaction.amount
      break
    case 'funds_secured':
      // Le client voit que son argent est "protégé"
      break
    case 'order_placed':
      transaction.orderPlacedAt = now
      break
    case 'delivered':
      transaction.deliveredAt = now
      // Définir la fin de la période de vérification (48h)
      transaction.verificationEndsAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)
      break
    case 'completed':
      transaction.completedAt = now
      break
  }
  
  // Mettre à jour les infos de livraison si fournies
  if (options.deliveryInfo) {
    transaction.delivery = {
      ...transaction.delivery,
      ...options.deliveryInfo
    }
  }
  
  await transaction.save()
  
  // Notifier le client si demandé
  if (options.notifyClient && transaction.client.email) {
    await sendStatusNotification(transaction, previousStatus, newStatus)
  }
  
  return transaction
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications client
// ─────────────────────────────────────────────────────────────────────────────

async function sendStatusNotification(
  transaction: any,
  previousStatus: EscrowStatus,
  newStatus: EscrowStatus
) {
  const statusInfo = escrowStatusLabels[newStatus]
  const trackingUrl = `${siteUrl}/suivi/${transaction.reference}`
  
  const html = generateStatusEmail(transaction, statusInfo, trackingUrl)
  
  try {
    await emailService.sendEmail({
      to: transaction.client.email,
      subject: `${statusInfo.icon} ${statusInfo.label} - Commande ${transaction.reference}`,
      html
    })
    
    // Marquer comme notifié dans le timeline
    const lastEvent = transaction.timeline[transaction.timeline.length - 1]
    if (lastEvent) {
      lastEvent.notifiedClient = true
      await transaction.save()
    }
  } catch (error) {
    console.error('[ESCROW] Erreur notification:', error)
  }
}

function generateStatusEmail(transaction: any, statusInfo: any, trackingUrl: string): string {
  const progressSteps = [
    { status: 'payment_received', label: 'Paiement', icon: '💰' },
    { status: 'funds_secured', label: 'Sécurisé', icon: '🔒' },
    { status: 'order_placed', label: 'Commandé', icon: '📝' },
    { status: 'in_transit', label: 'En route', icon: '🚚' },
    { status: 'delivered', label: 'Livré', icon: '📦' },
    { status: 'completed', label: 'Terminé', icon: '✅' }
  ]
  
  const currentIndex = progressSteps.findIndex(s => s.status === transaction.status)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; }
        .header-icon { font-size: 48px; margin-bottom: 10px; }
        .content { padding: 30px; }
        .status-box { background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
        .status-icon { font-size: 36px; }
        .status-label { font-size: 20px; font-weight: bold; color: #059669; margin: 10px 0; }
        .progress-track { display: flex; justify-content: space-between; margin: 30px 0; padding: 0 10px; }
        .progress-step { text-align: center; flex: 1; position: relative; }
        .progress-step::after { content: ''; position: absolute; top: 15px; left: 50%; width: 100%; height: 3px; background: #e2e8f0; z-index: 0; }
        .progress-step:last-child::after { display: none; }
        .step-icon { width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px; position: relative; z-index: 1; font-size: 14px; }
        .step-icon.active { background: #10b981; color: white; }
        .step-icon.completed { background: #059669; color: white; }
        .step-label { font-size: 10px; color: #64748b; }
        .guarantee-box { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .guarantee-box h4 { margin: 0 0 10px; color: #92400e; }
        .button { display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; }
        .reference { font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-icon">🛡️</div>
          <h1>Mise à jour de votre commande</h1>
          <p>Référence: <span class="reference">${transaction.reference}</span></p>
        </div>
        
        <div class="content">
          <p>Bonjour <strong>${transaction.client.name}</strong>,</p>
          
          <div class="status-box">
            <div class="status-icon">${statusInfo.icon}</div>
            <div class="status-label">${statusInfo.label}</div>
            <p style="margin: 0; color: #64748b;">${statusInfo.description}</p>
          </div>
          
          <h3>📍 Progression de votre commande</h3>
          <div class="progress-track">
            ${progressSteps.map((step, index) => `
              <div class="progress-step">
                <div class="step-icon ${index < currentIndex ? 'completed' : index === currentIndex ? 'active' : ''}">
                  ${index <= currentIndex ? '✓' : step.icon}
                </div>
                <div class="step-label">${step.label}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="guarantee-box">
            <h4>🛡️ Vos garanties IT Vision Plus</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Remboursement intégral</strong> si non livré</li>
              <li><strong>Remplacement gratuit</strong> si produit défectueux</li>
              <li><strong>48h</strong> pour vérifier votre commande après livraison</li>
            </ul>
          </div>
          
          ${transaction.delivery?.trackingNumber ? `
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <strong>🚚 Suivi de livraison</strong><br>
              Transporteur: ${transaction.delivery.carrier || 'En cours'}<br>
              N° de suivi: <code>${transaction.delivery.trackingNumber}</code>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${trackingUrl}" class="button">
              Suivre ma commande en temps réel
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">
            <strong>Montant:</strong> ${transaction.amount.toLocaleString('fr-FR')} FCFA<br>
            <strong>Statut paiement:</strong> ${transaction.paidAmount >= transaction.amount ? '✅ Payé' : '⏳ En attente'}
          </p>
        </div>
        
        <div class="footer">
          <p>Une question ? Répondez à cet email ou appelez-nous.</p>
          <p>© ${new Date().getFullYear()} IT Vision Plus - Votre partenaire de confiance</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// ─────────────────────────────────────────────────────────────────────────────
// Gestion des litiges
// ─────────────────────────────────────────────────────────────────────────────

export async function openDispute(
  reference: string,
  dispute: {
    reason: string
    description: string
    evidence?: string[]
  }
) {
  await dbConnect()
  
  const transaction = await EscrowTransaction.findOne({ reference })
  if (!transaction) {
    throw new Error(`Transaction ${reference} non trouvée`)
  }
  
  // Vérifier que le litige est possible (après livraison, dans les 7 jours)
  if (!transaction.deliveredAt) {
    throw new Error('Impossible d\'ouvrir un litige avant la livraison')
  }
  
  const daysSinceDelivery = Math.floor(
    (Date.now() - transaction.deliveredAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (daysSinceDelivery > 7) {
    throw new Error('La période de réclamation de 7 jours est dépassée')
  }
  
  transaction.dispute = {
    openedAt: new Date(),
    reason: dispute.reason,
    description: dispute.description,
    evidence: dispute.evidence || []
  }
  
  transaction.addEvent('disputed', `Litige ouvert: ${dispute.reason}`)
  
  await transaction.save()
  
  // Notifier l'admin par email
  // TODO: Ajouter notification admin
  
  return transaction
}

/**
 * Résoudre un litige
 */
export async function resolveDispute(
  reference: string,
  resolution: {
    decision: 'refund_full' | 'refund_partial' | 'replacement' | 'rejected'
    note: string
    refundAmount?: number
    adminId: string
  }
) {
  await dbConnect()
  
  const transaction = await EscrowTransaction.findOne({ reference })
  if (!transaction || !transaction.dispute) {
    throw new Error('Transaction ou litige non trouvé')
  }
  
  transaction.dispute.resolution = resolution.note
  transaction.dispute.resolvedAt = new Date()
  
  switch (resolution.decision) {
    case 'refund_full':
      transaction.refund = {
        amount: transaction.amount,
        reason: transaction.dispute.reason,
        method: 'wave' // Par défaut
      }
      transaction.addEvent('refunded', `Remboursement intégral: ${resolution.note}`, resolution.adminId)
      break
      
    case 'refund_partial':
      transaction.refund = {
        amount: resolution.refundAmount || 0,
        reason: transaction.dispute.reason,
        method: 'wave'
      }
      transaction.addEvent('refunded', `Remboursement partiel (${resolution.refundAmount} FCFA): ${resolution.note}`, resolution.adminId)
      break
      
    case 'replacement':
      transaction.addEvent('order_placed', `Remplacement du produit: ${resolution.note}`, resolution.adminId)
      break
      
    case 'rejected':
      transaction.addEvent('completed', `Litige rejeté: ${resolution.note}`, resolution.adminId)
      break
  }
  
  await transaction.save()
  
  return transaction
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer une transaction par référence (pour le client)
 */
export async function getTransactionByReference(reference: string) {
  await dbConnect()
  return EscrowTransaction.findOne({ reference })
}

/**
 * Récupérer toutes les transactions d'un utilisateur
 */
export async function getUserTransactions(userId: string) {
  await dbConnect()
  return EscrowTransaction.find({ userId }).sort({ createdAt: -1 })
}

/**
 * Compléter automatiquement les transactions après la période de vérification
 */
export async function autoCompleteVerifiedTransactions() {
  await dbConnect()
  
  const now = new Date()
  
  // Trouver les transactions en période de vérification expirée
  const transactions = await EscrowTransaction.find({
    status: { $in: ['delivered', 'verification'] },
    verificationEndsAt: { $lt: now },
    'dispute.openedAt': { $exists: false } // Pas de litige ouvert
  })
  
  for (const transaction of transactions) {
    transaction.addEvent('completed', 'Transaction complétée automatiquement après période de vérification')
    transaction.completedAt = now
    await transaction.save()
    
    // Notifier le client
    if (transaction.client.email) {
      await sendStatusNotification(transaction, 'verification', 'completed')
    }
  }
  
  return transactions.length
}

export default {
  createEscrowTransaction,
  updateEscrowStatus,
  openDispute,
  resolveDispute,
  getTransactionByReference,
  getUserTransactions,
  autoCompleteVerifiedTransactions
}
