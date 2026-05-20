const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🔧 Configuration SMTP OVH:');
  console.log('Host:', process.env.SMTP_HOST || 'ssl0.ovh.net');
  console.log('Port:', process.env.SMTP_PORT || '465');
  console.log('User:', process.env.SMTP_USER || 'contact@itvisionplus.sn');
  console.log('From:', process.env.SMTP_FROM || 'contact@itvisionplus.sn');
  console.log('Secure:', process.env.SMTP_SECURE || 'true');
  console.log('');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'ssl0.ovh.net',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: (process.env.SMTP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER || 'contact@itvisionplus.sn',
      pass: process.env.SMTP_PASS || 'KHayri_123456$$'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  console.log('📧 Test de connexion SMTP...');
  try {
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie!');
  } catch (error) {
    console.error('❌ Erreur de connexion SMTP:', error.message);
    return;
  }

  console.log('');
  console.log('📨 Envoi d\'email de test vers cheikhoumarndiaye@gmail.com...');
  
  try {
    const info = await transporter.sendMail({
      from: `"IT Vision Plus" <${process.env.SMTP_FROM || 'contact@itvisionplus.sn'}>`,
      to: 'cheikhoumarndiaye@gmail.com',
      subject: 'Test SMTP - IT Vision Plus',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
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
              <p>Ceci est un email de test pour vérifier la configuration SMTP OVH.</p>
              
              <p><strong>Configuration utilisée:</strong></p>
              <ul>
                <li>Serveur: ssl0.ovh.net</li>
                <li>Port: 465 (SSL)</li>
                <li>Expéditeur: contact@itvisionplus.sn</li>
              </ul>
              
              <p>Si vous recevez cet email, la configuration SMTP fonctionne correctement! ✅</p>
              
              <div style="text-align: center;">
                <a href="https://itvisionplus.sn" class="button">Visiter IT Vision Plus</a>
              </div>
              
              <div class="footer">
                <p>IT Vision Plus - Solutions de Sécurité Électronique</p>
                <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Test SMTP - IT Vision Plus

Bonjour,

Ceci est un email de test pour vérifier la configuration SMTP OVH.

Configuration utilisée:
- Serveur: ssl0.ovh.net
- Port: 465 (SSL)
- Expéditeur: contact@itvisionplus.sn

Si vous recevez cet email, la configuration SMTP fonctionne correctement!

IT Vision Plus - Solutions de Sécurité Électronique
Date: ${new Date().toLocaleString('fr-FR')}
      `
    });

    console.log('✅ Email envoyé avec succès!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi:', error.message);
    console.error('Détails:', error);
  }
}

testEmail().catch(console.error);
