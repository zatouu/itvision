import nodemailer from 'nodemailer'
import SentEmail from '@/lib/models/SentEmail'
import { BrandConfig, getDefaultBrand } from './branding'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  pool?: boolean
  auth?: {
    user: string
    pass: string
  }
  tls?: {
    rejectUnauthorized?: boolean
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
  brand?: BrandConfig
  fromName?: string
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private isConfigured = false
  private verified = false
  private verifyPromise: Promise<boolean> | null = null

  constructor() {
    this.initializeTransporter()
  }

  private getSmtpFromAddress(fromName?: string): string {
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@itvisionplus.sn'
    const name = fromName || process.env.SMTP_FROM_NAME || getDefaultBrand().name
    return `"${name}" <${fromEmail}>`
  }

  private getBccRecipients(extraBcc?: string): string {
    const defaultBcc = process.env.SMTP_BCC || 'contact@itvisionplus.sn'
    if (extraBcc) return `${extraBcc}, ${defaultBcc}`
    return defaultBcc
  }

  private initializeTransporter() {
    try {
      const host = process.env.SMTP_HOST?.trim() || ''
      if (!host) {
        console.warn('[EMAIL] SMTP_HOST non défini — emails simulés en console')
        this.isConfigured = false
        this.verified = false
        return
      }

      const port = parseInt(process.env.SMTP_PORT || '587', 10)
      const secure = process.env.SMTP_SECURE === 'true' || (port === 465 || port === 4650)
      const user = process.env.SMTP_USER || ''
      const pass = process.env.SMTP_PASS || ''
      const requireAuth = process.env.SMTP_REQUIRE_AUTH !== 'false'

      if (requireAuth && (!user || !pass)) {
        console.warn('[EMAIL] SMTP_USER/SMTP_PASS manquants — emails simulés')
        this.isConfigured = false
        this.verified = false
        return
      }

      const config: EmailConfig = {
        host,
        port,
        secure,
        pool: process.env.SMTP_POOL === 'true',
        ...(requireAuth ? { auth: { user, pass } } : {}),
        tls: {
          rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
        }
      }

      this.transporter = nodemailer.createTransport(config)
      this.isConfigured = true
      this.verified = false

      console.log('[EMAIL] Transport SMTP créé pour', host)
    } catch (error) {
      console.error('[EMAIL] Erreur lors de l\'initialisation:', error)
      this.isConfigured = false
      this.verified = false
    }
  }

  private async ensureTransporterVerified(): Promise<boolean> {
    if (!this.transporter) return false
    if (this.verified) return true
    if (this.verifyPromise) return this.verifyPromise

    this.verifyPromise = (async () => {
      try {
        await this.transporter!.verify()
        this.verified = true
        console.log('[EMAIL] Vérification SMTP réussie')
        return true
      } catch (err) {
        console.error('[EMAIL] Vérification SMTP échouée:', err)
        this.isConfigured = false
        this.verified = false
        return false
      } finally {
        this.verifyPromise = null
      }
    })()

    return this.verifyPromise
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    const bccRecipients = this.getBccRecipients(emailData.bcc)
    const fromAddress = this.getSmtpFromAddress(emailData.fromName || emailData.brand?.name)

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

    const smtpReady = await this.ensureTransporterVerified()
    if (!smtpReady) {
      console.warn('[EMAIL] Transport SMTP non vérifié, email simulé:', emailData.subject)
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
  generatePasswordResetEmail(userEmail: string, resetToken: string, brand: BrandConfig = getDefaultBrand()): EmailData {
    const resetUrl = `${brand.url}/reset-password?token=${resetToken}`
    const primary = brand.primaryColor || '#667eea'
    const secondary = brand.secondaryColor || '#764ba2'
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation de mot de passe - ${brand.name}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Réinitialisation de mot de passe</h1>
            <p>${brand.name} - ${brand.tagline}</p>
          </div>
          <div class="content">
            <h2>Bonjour,</h2>
            <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ${brand.name}.</p>
            
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
            <p>📧 Email: ${brand.supportEmail}<br>
            📱 WhatsApp: ${brand.whatsapp}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${brand.name} - Tous droits réservés</p>
            <p>Cet email a été envoyé à ${userEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `

    return {
      to: userEmail,
      subject: `🔐 Réinitialisation de votre mot de passe - ${brand.name}`,
      brand,
      html,
      text: `
        Réinitialisation de mot de passe - ${brand.name}
        
        Bonjour,
        
        Vous avez demandé la réinitialisation de votre mot de passe.
        
        Cliquez sur ce lien pour créer un nouveau mot de passe :
        ${resetUrl}
        
        Ce lien expire dans 1 heure.
        
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        
        Support: ${brand.supportEmail} | WhatsApp: ${brand.whatsapp}
      `
    }
  }

  // Template pour confirmation de rendez-vous
  generateAppointmentConfirmationEmail(bookingData: any, brand: BrandConfig = getDefaultBrand()): EmailData {
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

    const primary = brand.primaryColor || '#667eea'
    const secondary = brand.secondaryColor || '#764ba2'
    const siteUrl = brand.url

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmation de Rendez-vous - ${brand.name}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .appointment-card { background: white; border-radius: 10px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #1f2937; }
          .urgency-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; color: white; }
          .button { display: inline-block; background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .contact-info { background: #e5f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .calendar-link { background: #f0f9ff; border: 1px solid #0ea5e9; padding: 15px; border-radius: 5px; margin: 10px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Confirmation de Rendez-vous</h1>
            <p>${brand.name} - ${brand.tagline}</p>
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
              <a href="${siteUrl}/api/booking/ics?title=${encodeURIComponent(`RDV ${serviceName}`)}&description=${encodeURIComponent(`Client: ${bookingData.clientInfo.name}\\nTéléphone: ${bookingData.clientInfo.phone}\\nDétails: ${bookingData.details || ''}`)}&location=${encodeURIComponent(bookingData.address)}&start=${encodeURIComponent(`${bookingData.date}T${bookingData.time}`)}&end=${encodeURIComponent(`${bookingData.date}T${bookingData.time.split(':').map((n: string, i: number) => i === 0 ? String(Math.min(23, parseInt(n) + 2)).padStart(2, '0') : n).join(':')}`)}" 
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
                <li>📧 Email: ${brand.contactEmail}</li>
                <li>📱 WhatsApp: ${brand.whatsapp}</li>
                <li>☎️ Téléphone: +221 33 xxx xx xx</li>
              </ul>
            </div>

            <p><strong>Merci de votre confiance !</strong></p>
            <p>L'équipe ${brand.name}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${brand.name} - Tous droits réservés</p>
            <p>Cet email a été envoyé à ${bookingData.clientInfo.email}</p>
          </div>
        </div>
      </body>
      </html>
    `

    return {
      to: bookingData.clientInfo.email,
      subject: `🗓️ Confirmation de RDV - ${serviceName} le ${appointmentDate}`,
      brand,
      html,
      text: `
        Confirmation de Rendez-vous - ${brand.name}
        
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
        
        Contact: ${brand.contactEmail} | WhatsApp: ${brand.whatsapp}
        
        Merci de votre confiance !
        L'équipe ${brand.name}
      `
    }
  }

  // Template pour confirmation d'inscription
  generateWelcomeEmail(userEmail: string, userName: string, brand: BrandConfig = getDefaultBrand()): EmailData {
    const primary = brand.primaryColor || '#667eea'
    const secondary = brand.secondaryColor || '#764ba2'
    const siteUrl = brand.url

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue chez ${brand.name}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bienvenue chez ${brand.name} !</h1>
            <p>${brand.tagline}</p>
          </div>
          <div class="content">
            <h2>Bonjour ${userName},</h2>
            <p>Félicitations ! Votre compte ${brand.name} a été créé avec succès.</p>
            
            <p>Vous pouvez maintenant accéder à votre espace personnel pour :</p>
            <ul>
              <li>📊 Suivre vos projets en temps réel</li>
              <li>📋 Consulter vos rapports de maintenance</li>
              <li>💬 Communiquer avec nos équipes</li>
              <li>📄 Gérer vos factures et devis</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${siteUrl}/login" class="button">Accéder à mon compte</a>
            </div>
            
            <p>Notre équipe est là pour vous accompagner dans tous vos projets.</p>
            
            <p>📧 Email: ${brand.supportEmail}<br>
            📱 WhatsApp: ${brand.whatsapp}<br>
            🌐 Site web: ${brand.url.replace(/^https?:\/\//, '')}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${brand.name} - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `

    return {
      to: userEmail,
      subject: `🎉 Bienvenue chez ${brand.name} !`,
      brand,
      html,
      text: `
        Bienvenue chez ${brand.name} !
        
        Bonjour ${userName},
        
        Votre compte a été créé avec succès.
        
        Connectez-vous sur : ${siteUrl}/login
        
        Support: ${brand.supportEmail} | WhatsApp: ${brand.whatsapp}
      `
    }
  }

  // Template pour notification de changement d'email du compte client
  generateEmailChangedNotification(userEmail: string, userName: string, resetUrl: string, brand: BrandConfig = getDefaultBrand()): EmailData {
    const primary = brand.primaryColor || '#667eea'
    const secondary = brand.secondaryColor || '#764ba2'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Changement d'email - ${brand.name}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .info { background: #e0f2fe; border: 1px solid #bae6fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Votre email a été mis à jour</h1>
            <p>${brand.name} - Espace Client</p>
          </div>
          <div class="content">
            <h2>Bonjour ${userName},</h2>
            <p>L'email de votre compte ${brand.name} a été modifié par notre équipe.</p>

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

            <p>📧 Email: ${brand.supportEmail}<br>
            📱 WhatsApp: ${brand.whatsapp}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${brand.name} - Tous droits réservés</p>
            <p>Cet email a été envoyé à ${userEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `

    return {
      to: userEmail,
      subject: `📧 Votre email de connexion a été mis à jour - ${brand.name}`,
      brand,
      html,
      text: `
        Changement d'email - ${brand.name}

        Bonjour ${userName},

        L'email de votre compte ${brand.name} a été modifié par notre équipe.
        Nouvel email: ${userEmail}

        Définissez votre nouveau mot de passe ici :
        ${resetUrl}

        Ce lien expire dans 24 heures.

        Support: ${brand.supportEmail} | WhatsApp: ${brand.whatsapp}
      `
    }
  }
}

// Instance singleton
export const emailService = new EmailService()
export default emailService