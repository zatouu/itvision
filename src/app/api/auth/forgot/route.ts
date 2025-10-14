import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import emailService from '@/lib/email-service'
import crypto from 'crypto'

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Format d\'email invalide' }, { status: 400 })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    
    // Toujours retourner success pour éviter l'énumération d'emails
    if (!user) {
      console.log(`[RESET] Tentative de reset pour email inexistant: ${email}`)
      return NextResponse.json({ success: true })
    }

    // Vérifier si un token récent existe déjà (rate limiting)
    if (user.passwordResetExpires && user.passwordResetExpires > new Date(Date.now() - 5 * 60 * 1000)) {
      console.log(`[RESET] Token récent existe déjà pour: ${email}`)
      return NextResponse.json({ success: true })
    }

    const token = generateSecureToken()
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1h

    await User.updateOne({ _id: user._id }, {
      $set: {
        passwordResetToken: token,
        passwordResetExpires: expires
      }
    })

    // Envoyer l'email de réinitialisation
    try {
      const emailData = emailService.generatePasswordResetEmail(user.email, token)
      const emailSent = await emailService.sendEmail(emailData)
      
      if (emailSent) {
        console.log(`[RESET] Email de réinitialisation envoyé à: ${user.email}`)
      } else {
        console.error(`[RESET] Échec de l'envoi d'email à: ${user.email}`)
      }
    } catch (emailError) {
      console.error('[RESET] Erreur lors de l\'envoi d\'email:', emailError)
      // Ne pas faire échouer la requête si l'email ne peut pas être envoyé
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[RESET] Erreur serveur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
