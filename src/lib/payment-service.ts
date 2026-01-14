/**
 * Service de paiement pour le Sénégal
 * Supporte Wave et Orange Money via liens de paiement
 * 
 * Note: Pour une intégration complète, utiliser les APIs officielles:
 * - Wave: https://docs.wave.com/
 * - Orange Money: API SN via partenaire
 * - PayDunya: https://paydunya.com/
 */

export interface PaymentRequest {
  amount: number
  currency?: string
  reference: string
  description: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  callbackUrl?: string
  returnUrl?: string
}

export interface PaymentLink {
  provider: 'wave' | 'orange_money' | 'manual'
  url?: string
  instructions: string
  reference: string
  amount: number
  phoneNumber?: string
}

// Numéros de paiement de l'entreprise (à configurer en .env)
const WAVE_MERCHANT_PHONE = process.env.WAVE_MERCHANT_PHONE || '+221770000000'
const ORANGE_MERCHANT_PHONE = process.env.ORANGE_MERCHANT_PHONE || '+221760000000'

const formatCurrency = (amount: number, currency = 'FCFA') => 
  `${amount.toLocaleString('fr-FR')} ${currency}`

/**
 * Génère un lien de paiement Wave
 * Wave utilise des liens universels: wave.com/send?phone=XXX&amount=XXX
 */
export function generateWavePaymentLink(request: PaymentRequest): PaymentLink {
  const { amount, reference, description, customerName } = request
  
  // Format Wave: le client envoie de l'argent au numéro marchand
  const waveUrl = `https://wave.com/send?` + new URLSearchParams({
    phone: WAVE_MERCHANT_PHONE.replace('+', ''),
    amount: amount.toString(),
    note: `${reference} - ${customerName}`
  }).toString()
  
  return {
    provider: 'wave',
    url: waveUrl,
    reference,
    amount,
    phoneNumber: WAVE_MERCHANT_PHONE,
    instructions: `
📱 **Paiement Wave**

1. Ouvrez l'app Wave
2. Appuyez sur "Envoyer"
3. Entrez le numéro: **${WAVE_MERCHANT_PHONE}**
4. Montant: **${formatCurrency(amount)}**
5. Dans "Note", écrivez: **${reference}**
6. Confirmez le paiement

⚠️ Important: Notez bien la référence **${reference}** pour que nous puissions identifier votre paiement.

Ou cliquez sur ce lien depuis votre téléphone:
${waveUrl}
    `.trim()
  }
}

/**
 * Génère les instructions de paiement Orange Money
 * Orange Money n'a pas de lien universel public, instructions manuelles
 */
export function generateOrangeMoneyPaymentLink(request: PaymentRequest): PaymentLink {
  const { amount, reference, customerName } = request
  
  return {
    provider: 'orange_money',
    reference,
    amount,
    phoneNumber: ORANGE_MERCHANT_PHONE,
    instructions: `
📱 **Paiement Orange Money**

1. Composez **#144#** sur votre téléphone Orange
2. Choisissez "Transfert d'argent"
3. Entrez le numéro: **${ORANGE_MERCHANT_PHONE}**
4. Montant: **${formatCurrency(amount)}**
5. Confirmez avec votre code secret
6. Envoyez-nous une capture d'écran avec la référence: **${reference}**

Ou via l'app Orange Money:
1. Ouvrez Orange Money
2. "Envoyer de l'argent"
3. Numéro: **${ORANGE_MERCHANT_PHONE}**
4. Montant: **${formatCurrency(amount)}**
5. Motif: **${reference} - ${customerName}**

⚠️ Après paiement, envoyez la confirmation par WhatsApp au ${ORANGE_MERCHANT_PHONE} avec la référence **${reference}**
    `.trim()
  }
}

/**
 * Génère les instructions pour paiement manuel (espèces, virement)
 */
export function generateManualPaymentInstructions(request: PaymentRequest): PaymentLink {
  const { amount, reference, customerName } = request
  
  return {
    provider: 'manual',
    reference,
    amount,
    instructions: `
💰 **Paiement Manuel**

**Référence:** ${reference}
**Montant:** ${formatCurrency(amount)}
**Client:** ${customerName}

**Options:**
1. **Espèces** - Passez à nos bureaux avec la référence
2. **Virement bancaire** - Contactez-nous pour les coordonnées bancaires

📍 Adresse: Dakar, Sénégal (adresse complète sur demande)
📞 Contact: ${WAVE_MERCHANT_PHONE}

Présentez la référence **${reference}** lors du paiement.
    `.trim()
  }
}

/**
 * Génère tous les liens de paiement disponibles
 */
export function generateAllPaymentLinks(request: PaymentRequest): PaymentLink[] {
  return [
    generateWavePaymentLink(request),
    generateOrangeMoneyPaymentLink(request),
    generateManualPaymentInstructions(request)
  ]
}

/**
 * Génère un email avec les instructions de paiement
 */
export function generatePaymentInstructionsEmail(
  request: PaymentRequest,
  groupInfo: { groupId: string; productName: string; deadline: string }
): { subject: string; html: string } {
  const waveLink = generateWavePaymentLink(request)
  const orangeLink = generateOrangeMoneyPaymentLink(request)
  
  const subject = `💰 Instructions de paiement - Achat Groupé ${groupInfo.productName}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; padding: 25px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f8fafc; padding: 25px; border-radius: 0 0 12px 12px; }
        .amount-box { background: white; border: 2px solid #7c3aed; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
        .amount { font-size: 32px; font-weight: bold; color: #7c3aed; }
        .reference { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 15px 0; }
        .payment-option { background: white; border-radius: 12px; padding: 20px; margin: 15px 0; border: 1px solid #e2e8f0; }
        .payment-option h3 { margin-top: 0; color: #1e293b; }
        .wave { border-left: 4px solid #00b4d8; }
        .orange { border-left: 4px solid #ff6b00; }
        .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
        code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Instructions de Paiement</h1>
          <p>Achat Groupé #${groupInfo.groupId}</p>
        </div>
        
        <div class="content">
          <p>Bonjour <strong>${request.customerName}</strong>,</p>
          <p>L'objectif de l'achat groupé pour <strong>${groupInfo.productName}</strong> a été atteint ! 🎉</p>
          <p>Merci de procéder au paiement pour valider votre participation.</p>
          
          <div class="amount-box">
            <p style="margin: 0; color: #64748b;">Montant à payer</p>
            <p class="amount">${formatCurrency(request.amount)}</p>
            <p style="margin: 0; font-size: 14px; color: #64748b;">${request.description}</p>
          </div>
          
          <div class="reference">
            <strong>⚠️ Référence obligatoire:</strong> <code>${request.reference}</code><br>
            <small>Indiquez cette référence dans votre paiement pour que nous puissions l'identifier.</small>
          </div>
          
          <h2>Choisissez votre méthode de paiement:</h2>
          
          <div class="payment-option wave">
            <h3>📱 Wave (Recommandé)</h3>
            <p><strong>Numéro:</strong> ${WAVE_MERCHANT_PHONE}</p>
            <p><strong>Montant:</strong> ${formatCurrency(request.amount)}</p>
            <p><strong>Note:</strong> ${request.reference}</p>
            ${waveLink.url ? `<a href="${waveLink.url}" class="button" style="background: #00b4d8;">Payer avec Wave</a>` : ''}
          </div>
          
          <div class="payment-option orange">
            <h3>📱 Orange Money</h3>
            <p><strong>Numéro:</strong> ${ORANGE_MERCHANT_PHONE}</p>
            <p><strong>Montant:</strong> ${formatCurrency(request.amount)}</p>
            <p>Composez <strong>#144#</strong> ou utilisez l'app Orange Money</p>
            <p><small>Après paiement, envoyez la confirmation WhatsApp avec la référence.</small></p>
          </div>
          
          <div class="payment-option">
            <h3>🏦 Autres méthodes</h3>
            <p>Contactez-nous pour paiement par espèces ou virement bancaire.</p>
            <p>📞 ${WAVE_MERCHANT_PHONE}</p>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">
            <strong>Date limite:</strong> ${new Date(groupInfo.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} IT Vision Plus - Votre partenaire sécurité</p>
          <p>Des questions ? Répondez à cet email ou appelez-nous.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  return { subject, html }
}

/**
 * Valide un numéro de téléphone sénégalais
 */
export function validateSenegalPhone(phone: string): boolean {
  // Formats acceptés: +221 XX XXX XX XX, 221XXXXXXXXX, 7X XXX XX XX, 70/76/77/78 + 7 chiffres
  const cleaned = phone.replace(/\s|-/g, '')
  const patterns = [
    /^\+221[7][0678]\d{7}$/,  // +221 70/76/77/78 + 7 chiffres
    /^221[7][0678]\d{7}$/,    // 221 70/76/77/78 + 7 chiffres
    /^[7][0678]\d{7}$/,       // 70/76/77/78 + 7 chiffres
    /^0[7][0678]\d{7}$/       // 070/076/077/078 + 7 chiffres
  ]
  return patterns.some(p => p.test(cleaned))
}

/**
 * Formate un numéro de téléphone sénégalais
 */
export function formatSenegalPhone(phone: string): string {
  const cleaned = phone.replace(/\s|-/g, '')
  let number = cleaned
  
  if (number.startsWith('+221')) {
    number = number.slice(4)
  } else if (number.startsWith('221')) {
    number = number.slice(3)
  } else if (number.startsWith('0')) {
    number = number.slice(1)
  }
  
  // Format: +221 XX XXX XX XX
  if (number.length === 9) {
    return `+221 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 7)} ${number.slice(7)}`
  }
  
  return phone
}

export default {
  generateWavePaymentLink,
  generateOrangeMoneyPaymentLink,
  generateManualPaymentInstructions,
  generateAllPaymentLinks,
  generatePaymentInstructionsEmail,
  validateSenegalPhone,
  formatSenegalPhone
}
