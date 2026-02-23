const nodemailer = require('nodemailer');

// Configuration OVH
const config = {
  host: process.env.SMTP_HOST || 'ssl0.ovh.net',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'contact@itvisionplus.sn',
    pass: process.env.SMTP_PASS || '',
  },
  debug: true,
  logger: true
};

console.log('=== Test SMTP OVH ===');
console.log('Configuration:', {
  host: config.host,
  port: config.port,
  secure: config.secure,
  user: config.auth.user,
  from: process.env.SMTP_FROM || config.auth.user
});

if (!config.auth.pass) {
  console.error('❌ Erreur: SMTP_PASS non défini');
  process.exit(1);
}

const transporter = nodemailer.createTransport(config);

// Vérifier la connexion
console.log('\n1. Vérification de la connexion SMTP...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Échec de la vérification:', error);
    console.log('\n💡 Suggestions:');
    console.log('   - Port 465 + SSL: essayer port 587 + STARTTLS');
    console.log('   - Vérifier le mot de passe dans le .env');
    console.log('   - Vérifier que le compte OVH est actif');
  } else {
    console.log('✅ Connexion SMTP vérifiée');
    
    // Envoyer le test
    console.log('\n2. Envoi du test vers zatou1900@gmail.com...');
    
    const mailOptions = {
      from: `"IT Vision Plus" <${process.env.SMTP_FROM || config.auth.user}>`,
      to: 'zatou1900@gmail.com',
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
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Test SMTP Réussi!</h1>
            </div>
            <div class="content">
              <h2>Bonjour,</h2>
              <p>Ceci est un email de test pour vérifier la configuration SMTP OVH d'IT Vision Plus.</p>
              <p><strong>Configuration utilisée:</strong></p>
              <ul>
                <li>Serveur: ssl0.ovh.net</li>
                <li>Port: ${config.port} (${config.secure ? 'SSL' : 'STARTTLS'})</li>
                <li>Expéditeur: ${config.auth.user}</li>
                <li>Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' })}</li>
              </ul>
              <p>Si vous recevez cet email, la configuration fonctionne parfaitement!</p>
            </div>
            <div class="footer">
              <p><strong>IT Vision Plus</strong> - Solutions de Sécurité Électronique</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Test SMTP - IT Vision Plus\n\nSi vous recevez cet email, la configuration fonctionne!\n\nConfig: ssl0.ovh.net:${config.port} (${config.secure ? 'SSL' : 'STARTTLS'})`
    };
    
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('❌ Échec de l\'envoi:', err);
        console.log('\n💡 Erreurs communes OVH:');
        console.log('   - Authentification: vérifier SMTP_USER et SMTP_PASS');
        console.log('   - Port 465 bloqué: essayer port 587 + secure:false');
        console.log('   - Compte non activé: vérifier dans l\'espace client OVH');
      } else {
        console.log('✅ Email envoyé avec succès!');
        console.log('   Message ID:', info.messageId);
        console.log('   Réponse serveur:', info.response);
        console.log('\n📧 Vérifiez la boîte de réception de zatou1900@gmail.com');
      }
      transporter.close();
    });
  }
});
