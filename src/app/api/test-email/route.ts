import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email-service'
import { getBrandFromHost } from '@/lib/branding'

export async function GET(request: NextRequest) {
  try {
    const brand = getBrandFromHost(request.nextUrl.host)

    console.log('📧 Test d\'envoi d\'email vers zatou1900@gmail.com')
    console.log('Configuration SMTP:')
    console.log('- Host:', process.env.SMTP_HOST)
    console.log('- Port:', process.env.SMTP_PORT)
    console.log('- User:', process.env.SMTP_USER)
    console.log('- From:', process.env.SMTP_FROM)
    console.log('- Secure:', process.env.SMTP_SECURE)

    const result = await emailService.sendEmail({
      to: 'zatou1900@gmail.com',
      fromName: brand.name,
      brand,
      subject: `Test SMTP - ${brand.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info { background: #e0e7ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Test SMTP Réussi!</h1>
            </div>
            <div class="content">
              <h2>Bonjour,</h2>
              <p>Ceci est un email de test pour vérifier la configuration SMTP OVH de ${brand.name}.</p>
              
              <div class="info">
                <p><strong>📋 Configuration utilisée:</strong></p>
                <ul>
                  <li>Serveur: ssl0.ovh.net</li>
                  <li>Port: 465 (SSL)</li>
                  <li>Expéditeur: ${process.env.SMTP_FROM || brand.contactEmail}</li>
                  <li>Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' })}</li>
                </ul>
              </div>
              
              <p>✅ Si vous recevez cet email, la configuration SMTP fonctionne parfaitement!</p>
              
              <p>Les emails suivants seront envoyés automatiquement :</p>
              <ul>
                <li>Invitations clients pour accès au portail</li>
                <li>Réinitialisation de mot de passe</li>
                <li>Notifications de projets</li>
                <li>Alertes de tickets support</li>
              </ul>
              
              <div class="footer">
                <p><strong>${brand.name}</strong></p>
                <p>${brand.tagline}</p>
                <p>📧 ${brand.contactEmail} | 🌐 ${brand.url.replace(/^https?:\/\//, '')}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Test SMTP - ${brand.name}

Bonjour,

Ceci est un email de test pour vérifier la configuration SMTP OVH de ${brand.name}.

Configuration utilisée:
- Serveur: ssl0.ovh.net
- Port: 465 (SSL)
- Expéditeur: ${process.env.SMTP_FROM || brand.contactEmail}
- Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' })}

Si vous recevez cet email, la configuration SMTP fonctionne parfaitement!

Les emails suivants seront envoyés automatiquement :
- Invitations clients pour accès au portail
- Réinitialisation de mot de passe
- Notifications de projets
- Alertes de tickets support

${brand.name}
${brand.tagline}
${brand.contactEmail} | ${brand.url.replace(/^https?:\/\//, '')}
      `
    })

    console.log('✅ Email envoyé avec succès:', result)

    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès à zatou1900@gmail.com',
      details: result
    })
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        name: error.name,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      }
    }, { status: 500 })
  }
}
