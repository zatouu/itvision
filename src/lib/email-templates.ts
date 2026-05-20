interface EmailTemplate {
  subject: string
  html: string
  text: string
}

const BRAND_COLORS = {
  navy: '#30326B',
  orange: '#FFC800',
  text: '#1F2937',
  textLight: '#6B7280',
  bg: '#F3F4F6'
}

export const getClientInvitationEmail = (name: string, url: string): EmailTemplate => {
  return {
    subject: 'Activation de votre compte IT Vision Plus',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: white;">
        <div style="background-color: ${BRAND_COLORS.navy}; padding: 24px; text-align: center;">
          <h1 style="color: ${BRAND_COLORS.orange}; margin: 0; font-size: 24px; letter-spacing: 1px;">IT VISION PLUS</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: ${BRAND_COLORS.navy}; margin-top: 0;">Bienvenue, ${name} !</h2>
          <p style="color: ${BRAND_COLORS.text}; line-height: 1.6;">
            Un compte entreprise a été créé pour vous sur le portail IT Vision Plus.
            Cela vous permettra d'accéder à vos factures, contrats et de suivre vos projets en temps réel.
          </p>
          <p style="color: ${BRAND_COLORS.text}; line-height: 1.6;">
            Pour activer votre compte et définir votre mot de passe, veuillez cliquer sur le bouton ci-dessous pour finaliser votre inscription :
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}" style="background-color: ${BRAND_COLORS.orange}; color: ${BRAND_COLORS.navy}; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Activer mon compte</a>
          </div>
          <p style="font-size: 14px; color: ${BRAND_COLORS.textLight}; border-top: 1px solid #f3f4f6; padding-top: 20px; margin-top: 20px;">
            Ce lien est valable pendant 24 heures. Si le bouton ne fonctionne pas, copiez ce lien :<br>
            <a href="${url}" style="color: ${BRAND_COLORS.navy}; word-break: break-all;">${url}</a>
          </p>
        </div>
        <div style="background-color: ${BRAND_COLORS.bg}; padding: 16px; text-align: center; font-size: 12px; color: ${BRAND_COLORS.textLight};">
            © ${new Date().getFullYear()} IT Vision Plus.
        </div>
      </div>
    `,
    text: `Bienvenue ${name}. Activez votre compte IT Vision Plus en visitant ce lien : ${url}`
  }
}

export const getPasswordResetEmail = (name: string, url: string): EmailTemplate => {
  return {
    subject: 'Réinitialisation de votre mot de passe IT Vision Plus',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: white;">
        <div style="background-color: ${BRAND_COLORS.navy}; padding: 24px; text-align: center;">
          <h1 style="color: ${BRAND_COLORS.orange}; margin: 0; font-size: 24px; letter-spacing: 1px;">IT VISION PLUS</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: ${BRAND_COLORS.navy}; margin-top: 0;">Bonjour ${name},</h2>
          <p style="color: ${BRAND_COLORS.text}; line-height: 1.6;">
            Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}" style="background-color: ${BRAND_COLORS.orange}; color: ${BRAND_COLORS.navy}; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Réinitialiser le mot de passe</a>
          </div>
          <p style="font-size: 14px; color: ${BRAND_COLORS.textLight}; margin-top: 20px;">
            Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email. Le lien expirera dans 1 heure.
          </p>
        </div>
      </div>
    `,
    text: `Réinitialisez votre mot de passe ici : ${url}`
  }
}

export const getClientCredentialsEmail = (name: string, email: string, url: string, password: string): EmailTemplate => {
  return {
    subject: 'Vos identifiants de connexion IT Vision Plus',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: white;">
        <div style="background-color: ${BRAND_COLORS.navy}; padding: 24px; text-align: center;">
          <h1 style="color: ${BRAND_COLORS.orange}; margin: 0; font-size: 24px; letter-spacing: 1px;">IT VISION PLUS</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: ${BRAND_COLORS.navy}; margin-top: 0;">Bienvenue, ${name} !</h2>
          <p style="color: ${BRAND_COLORS.text}; line-height: 1.6;">
            Votre espace client a été activé. Voici vos identifiants de connexion :
          </p>
          
          <div style="background-color: ${BRAND_COLORS.bg}; padding: 20px; border-radius: 8px; margin: 24px 0;">
             <p style="margin: 0 0 10px 0;"><strong>Email :</strong> ${email}</p>
             <p style="margin: 0;"><strong>Mot de passe temporaire :</strong> <span style="font-family: monospace; background: white; padding: 2px 6px; border-radius: 4px;">${password}</span></p>
          </div>

          <p style="color: ${BRAND_COLORS.text}; line-height: 1.6;">
            Nous vous recommandons de changer ce mot de passe dès votre première connexion.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}" style="background-color: ${BRAND_COLORS.orange}; color: ${BRAND_COLORS.navy}; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accéder à mon espace</a>
          </div>
        </div>
        <div style="background-color: ${BRAND_COLORS.bg}; padding: 16px; text-align: center; font-size: 12px; color: ${BRAND_COLORS.textLight};">
            © ${new Date().getFullYear()} IT Vision Plus.
        </div>
      </div>
    `,
    text: `Bienvenue ${name}.\n\nVos identifiants :\nEmail: ${email}\nMot de passe: ${password}\n\nConnectez-vous ici : ${url}`
  }
}
