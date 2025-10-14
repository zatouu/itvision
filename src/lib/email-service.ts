import nodemailer from 'nodemailer'

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
  to: string
  subject: string
  html: string
  text?: string
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
    if (!this.isConfigured || !this.transporter) {
      console.warn('[EMAIL] Service non configuré, email simulé:', emailData.subject)
      // En mode développement, logguer l'email au lieu de l'envoyer
      this.logEmailToConsole(emailData)
      return true
    }

    try {
      const mailOptions = {
        from: `"IT Vision Plus" <${process.env.SMTP_USER}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || this.stripHtml(emailData.html)
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('[EMAIL] Email envoyé avec succès:', result.messageId)
      return true
    } catch (error) {
      console.error('[EMAIL] Erreur lors de l\'envoi:', error)
      // En cas d'erreur, logger l'email pour debug
      this.logEmailToConsole(emailData)
      return false
    }
  }

  private logEmailToConsole(emailData: EmailData) {
    console.log('\n=== EMAIL SIMULÉ ===')
    console.log(`À: ${emailData.to}`)
    console.log(`Sujet: ${emailData.subject}`)
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
}

// Instance singleton
export const emailService = new EmailService()
export default emailService