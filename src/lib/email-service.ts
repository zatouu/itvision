import nodemailer from 'nodemailer'
import SentEmail from '@/lib/models/SentEmail'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

interface EmailData {
  to: string | string[]
  cc?: string
  bcc?: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private isConfigured = false

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    try {
      // Configuration par défaut pour Gmail/SMTP
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      }

      // Vérifier si les variables d'environnement sont configurées
      if (!config.auth.user || !config.auth.pass) {
        console.warn('[EMAIL] Variables d\'environnement SMTP non configurées')
        this.isConfigured = false
        return
      }

      this.transporter = nodemailer.createTransport(config)
      this.isConfigured = true
      
      console.log('[EMAIL] Service d\'email initialisé avec succès')
    } catch (error) {
      console.error('[EMAIL] Erreur lors de l\'initialisation:', error)
      this.isConfigured = false
    }
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    const bccRecipients = emailData.bcc
      ? `${emailData.bcc}, contact@itvisionplus.sn`
      : 'contact@itvisionplus.sn'
    const fromAddress = `"IT Vision Plus" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`

    if (!this.isConfigured || !this.transporter) {
      console.warn('[EMAIL] Service non configuré, email simulé:', emailData.subject)
      this.logEmailToConsole(emailData)
      await this.logEmailToDb({
        emailData,
        fromAddress,
        bccRecipients,
        status: 'simulated'
      })
      return true
    }

    try {
      const mailOptions = {
        from: fromAddress,
        to: emailData.to,
        cc: emailData.cc,
        bcc: bccRecipients,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || this.stripHtml(emailData.html),
        attachments: emailData.attachments
      }

      const result: any = await this.transporter.sendMail(mailOptions as any)
      console.log('[EMAIL] Email envoyé avec succès:', result?.messageId)
      await this.logEmailToDb({
        emailData,
        fromAddress,
        bccRecipients,
        status: 'sent',
        messageId: result?.messageId
      })
      return true
    } catch (error) {
      console.error('[EMAIL] Erreur lors de l\'envoi:', error)
      this.logEmailToConsole(emailData)
      await this.logEmailToDb({
        emailData,
        fromAddress,
        bccRecipients,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  private async logEmailToDb(opts: {
    emailData: EmailData
    fromAddress: string
    bccRecipients: string
    status: 'sent' | 'failed' | 'simulated'
    messageId?: string
    error?: string
  }) {
    try {
      const toNormalized = Array.isArray(opts.emailData.to)
        ? opts.emailData.to
        : [opts.emailData.to]
      await SentEmail.create({
        to: toNormalized,
        cc: opts.emailData.cc,
        bcc: opts.bccRecipients,
        from: opts.fromAddress,
        subject: opts.emailData.subject,
        html: opts.emailData.html,
        text: opts.emailData.text,
        status: opts.status,
        messageId: opts.messageId,
        error: opts.error,
        sentAt: new Date()
      })
    } catch (logError) {
      console.error('[EMAIL] Erreur lors du logging en BDD:', logError)
    }
  }

  private logEmailToConsole(emailData: EmailData) {
    console.log('\n=== EMAIL SIMULÉ ===')
    console.log(`À: ${emailData.to}`)
    console.log(`Sujet: ${emailData.subject}`)
    if (emailData.attachments?.length) {
      console.log(`Pièces jointes: ${emailData.attachments.map(a => a.filename).join(', ')}`)
    }
    console.log('Contenu HTML:')
    console.log(emailData.html)
    console.log('===================\n')
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
  }

  // Template pour reset de mot de passe
  generatePasswordResetEmail(userEmail: string, resetToken: string): EmailData {
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation de mot de passe - IT Vision Plus</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Réinitialisation de mot de passe</h1>
            <p>IT Vision Plus - Sécurité Électronique</p>
          </div>
          <div class="content">
            <h2>Bonjour,</h2>
            <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte IT Vision Plus.</p>
            
            <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
            </div>
            
            <p>Ou copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            
            <div class="warning">
              <strong>⚠️ Important :</strong>
              <ul>
                <li>Ce lien expire dans <strong>1 heure</strong></li>
                <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                <li>Ne partagez jamais ce lien avec personne</li>
              </ul>
            </div>
            
            <p>Si vous avez des questions, contactez notre support :</p>
            <p>📧 Email: support@itvisionplus.sn<br>
            📱 WhatsApp: +221 77 413 34 40</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} IT Vision Plus - Tous droits réservés</p>
            <p>Cet email a été envoyé à ${userEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `

    return {
      to: userEmail,
      subject: '🔐 Réinitialisation de votre mot de passe - IT Vision Plus',
      html,
      text: `
        Réinitialisation de mot de passe - IT Vision Plus
        
        Bonjour,
        
        Vous avez demandé la réinitialisation de votre mot de passe.
        
        Cliquez sur ce lien pour créer un nouveau mot de passe :
        ${resetUrl}
        
        Ce lien expire dans 1 heure.
        
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        
        Support: support@itvisionplus.sn | WhatsApp: +221 77 413 34 40
      `
    }
  }

  // Template pour confirmation de rendez-vous
  generateAppointmentConfirmationEmail(bookingData: any): EmailData {
    const services = {
      'audit': 'Audit sécurité gratuit',
      'installation': 'Installation équipement',
      'maintenance': 'Maintenance préventive',
      'consultation': 'Consultation digitalisation'
    }

    const serviceName = services[bookingData.service as keyof typeof services] || bookingData.service
    const appointmentDate = new Date(bookingData.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const urgencyColors = {
      'normal': '#10b981',
      'urgent': '#f59e0b', 
      'critical': '#ef4444'
    }

    const urgencyLabels = {
      'normal': 'Normal',
      'urgent': 'Urgent (48h)',
      'critical': 'Critique (24h)'
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmation de Rendez-vous - IT Vision Plus</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .appointment-card { background: white; border-radius: 10px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #1f2937; }
          .urgency-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; color: white; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .contact-info { background: #e5f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .calendar-link { background: #f0f9ff; border: 1px solid #0ea5e9; padding: 15px; border-radius: 5px; margin: 10px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Confirmation de Rendez-vous</h1>
            <p>IT Vision Plus - Sécurité Électronique</p>
          </div>
          <div class="content">
            <h2>Bonjour ${bookingData.clientInfo.name},</h2>
            <p>Nous avons bien reçu votre demande de rendez-vous. Voici les détails :</p>
            
            <div class="appointment-card">
              <div class="detail-row">
                <span class="detail-label">🔧 Service demandé</span>
                <span class="detail-value">${serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📅 Date</span>
                <span class="detail-value">${appointmentDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">🕐 Heure</span>
                <span class="detail-value">${bookingData.time}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">⏱️ Durée estimée</span>
                <span class="detail-value">${bookingData.duration || '2-3h'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📍 Adresse</span>
                <span class="detail-value">${bookingData.address}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📞 Contact</span>
                <span class="detail-value">${bookingData.clientInfo.phone}</span>
              </div>
              ${bookingData.clientInfo.company ? `
              <div class="detail-row">
                <span class="detail-label">🏢 Entreprise</span>
                <span class="detail-value">${bookingData.clientInfo.company}</span>
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="detail-label">⚡ Urgence</span>
                <span class="urgency-badge" style="background-color: ${urgencyColors[bookingData.urgency as keyof typeof urgencyColors || 'normal']}">
                  ${urgencyLabels[bookingData.urgency as keyof typeof urgencyLabels || 'normal']}
                </span>
              </div>
            </div>

            ${bookingData.details ? `
            <div class="appointment-card">
              <h3>📝 Détails supplémentaires</h3>
              <p>${bookingData.details}</p>
            </div>
            ` : ''}

            <div class="calendar-link">
              <h3>📅 Ajouter à votre calendrier</h3>
              <p>Cliquez sur le lien ci-dessous pour ajouter ce rendez-vous à votre calendrier :</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/booking/ics?title=${encodeURIComponent(`RDV ${serviceName}`)}&description=${encodeURIComponent(`Client: ${bookingData.clientInfo.name}\\nTéléphone: ${bookingData.clientInfo.phone}\\nDétails: ${bookingData.details || ''}`)}&location=${encodeURIComponent(bookingData.address)}&start=${encodeURIComponent(`${bookingData.date}T${bookingData.time}`)}&end=${encodeURIComponent(`${bookingData.date}T${bookingData.time.split(':').map((n: string, i: number) => i === 0 ? String(Math.min(23, parseInt(n) + 2)).padStart(2, '0') : n).join(':')}`)}" 
                 class="button">
                📅 Télécharger le fichier .ics
              </a>
            </div>

            <div class="contact-info">
              <h3>📞 Prochaines étapes</h3>
              <p><strong>Votre demande est en cours de traitement.</strong></p>
              <p>Notre équipe va vous contacter dans les plus brefs délais pour confirmer définitivement ce créneau.</p>
              <p>En cas d'urgence ou pour toute modification, contactez-nous :</p>
              <ul>
                <li>📧 Email: contact@itvisionplus.sn</li>
                <li>📱 WhatsApp: +221 77 413 34 40</li>
                <li>☎️ Téléphone: +221 33 xxx xx xx</li>
              </ul>
            </div>

            <p><strong>Merci de votre confiance !</strong></p>
            <p>L'équipe IT Vision Plus</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} IT Vision Plus - Tous droits réservés</p>
            <p>Cet email a été envoyé à ${bookingData.clientInfo.email}</p>
          </div>
        </div>
      </body>
      </html>
    `

    return {
      to: bookingData.clientInfo.email,
      subject: `🗓️ Confirmation de RDV - ${serviceName} le ${appointmentDate}`,
      html,
      text: `
        Confirmation de Rendez-vous - IT Vision Plus
        
        Bonjour ${bookingData.clientInfo.name},
        
        Nous avons bien reçu votre demande de rendez-vous :
        
        Service: ${serviceName}
        Date: ${appointmentDate}
        Heure: ${bookingData.time}
        Durée: ${bookingData.duration || '2-3h'}
        Adresse: ${bookingData.address}
        Urgence: ${urgencyLabels[bookingData.urgency as keyof typeof urgencyLabels || 'normal']}
        
        ${bookingData.details ? `Détails: ${bookingData.details}` : ''}
        
        Notre équipe va vous contacter pour confirmation définitive.
        
        Contact: contact@itvisionplus.sn | WhatsApp: +221 77 413 34 40
        
        Merci de votre confiance !
        L'équipe IT Vision Plus
      `
    }
  }

  // Template pour confirmation d'inscription
  generateWelcomeEmail(userEmail: string, userName: string): EmailData {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue chez IT Vision Plus</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bienvenue chez IT Vision Plus !</h1>
            <p>Votre partenaire en sécurité électronique</p>
          </div>
          <div class="content">
            <h2>Bonjour ${userName},</h2>
            <p>Félicitations ! Votre compte IT Vision Plus a été créé avec succès.</p>
            
            <p>Vous pouvez maintenant accéder à votre espace personnel pour :</p>
            <ul>
              <li>📊 Suivre vos projets en temps réel</li>
              <li>📋 Consulter vos rapports de maintenance</li>
              <li>💬 Communiquer avec nos équipes</li>
              <li>📄 Gérer vos factures et devis</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login" class="button">Accéder à mon compte</a>
            </div>
            
            <p>Notre équipe est là pour vous accompagner dans tous vos projets de sécurité électronique.</p>
            
            <p>📧 Email: support@itvisionplus.sn<br>
            📱 WhatsApp: +221 77 413 34 40<br>
            🌐 Site web: www.itvisionplus.sn</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} IT Vision Plus - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `

    return {
      to: userEmail,
      subject: '🎉 Bienvenue chez IT Vision Plus !',
      html,
      text: `
        Bienvenue chez IT Vision Plus !
        
        Bonjour ${userName},
        
        Votre compte a été créé avec succès.
        
        Connectez-vous sur : ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login
        
        Support: support@itvisionplus.sn | WhatsApp: +221 77 413 34 40
      `
    }
  }

  // Template pour notification de changement d'email du compte client
  generateEmailChangedNotification(userEmail: string, userName: string, resetUrl: string): EmailData {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Changement d'email - IT Vision Plus</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .info { background: #e0f2fe; border: 1px solid #bae6fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Votre email a été mis à jour</h1>
            <p>IT Vision Plus - Espace Client</p>
          </div>
          <div class="content">
            <h2>Bonjour ${userName},</h2>
            <p>L'email de votre compte IT Vision Plus a été modifié par notre équipe.</p>

            <div class="info">
              <strong>Nouvel email :</strong> ${userEmail}
            </div>

            <p>Vous devez définir un nouveau mot de passe pour continuer à accéder à votre espace client :</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Définir mon mot de passe</a>
            </div>

            <p>Ou copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>

            <p><strong>Ce lien expire dans 24 heures.</strong></p>
            <p>Si vous n'êtes pas à l'origine de cette demande, contactez immédiatement notre support.</p>

            <p>📧 Email: support@itvisionplus.sn<br>
            📱 WhatsApp: +221 77 413 34 40</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} IT Vision Plus - Tous droits réservés</p>
            <p>Cet email a été envoyé à ${userEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `

    return {
      to: userEmail,
      subject: '📧 Votre email de connexion a été mis à jour - IT Vision Plus',
      html,
      text: `
        Changement d'email - IT Vision Plus

        Bonjour ${userName},

        L'email de votre compte IT Vision Plus a été modifié par notre équipe.
        Nouvel email: ${userEmail}

        Définissez votre nouveau mot de passe ici :
        ${resetUrl}

        Ce lien expire dans 24 heures.

        Support: support@itvisionplus.sn | WhatsApp: +221 77 413 34 40
      `
    }
  }
}

// Instance singleton
export const emailService = new EmailService()
export default emailService