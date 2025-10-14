import { NextRequest, NextResponse } from 'next/server'
import emailService from '@/lib/email-service'

interface BookingData {
  service: string
  date: string
  time: string
  duration?: string
  clientInfo: {
    name: string
    phone: string
    email?: string
    company?: string
  }
  address: string
  details?: string
  urgency?: 'normal' | 'urgent' | 'critical'
  channels?: { email?: boolean; sms?: boolean; whatsapp?: boolean }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BookingData
    if (!body?.service || !body?.date || !body?.time || !body?.clientInfo?.name || !body?.clientInfo?.phone || !body?.address) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const channels = body.channels || {}
    const events: any[] = []

    // Envoi d'email de confirmation
    if (channels.email && body.clientInfo.email) {
      try {
        const emailData = emailService.generateAppointmentConfirmationEmail(body)
        const emailSent = await emailService.sendEmail(emailData)
        
        events.push({
          type: 'email',
          to: body.clientInfo.email,
          subject: emailData.subject,
          status: emailSent ? 'sent' : 'failed'
        })
        
        console.log(`[BOOKING][EMAIL] ${emailSent ? 'Envoyé' : 'Échec'} à: ${body.clientInfo.email}`)
      } catch (emailError) {
        console.error('[BOOKING][EMAIL] Erreur:', emailError)
        events.push({
          type: 'email',
          to: body.clientInfo.email,
          status: 'error',
          error: emailError instanceof Error ? emailError.message : 'Erreur inconnue'
        })
      }
    }

    // SMS (stub - à implémenter avec un provider comme Twilio)
    if (channels.sms) {
      const smsMessage = `🗓️ RDV IT Vision confirmé:
${body.service}
📅 ${new Date(body.date).toLocaleDateString('fr-FR')} à ${body.time}
📍 ${body.address}
👤 ${body.clientInfo.name}

Notre équipe vous contactera pour confirmation définitive.
Contact: +221 77 413 34 40`

      events.push({
        type: 'sms',
        to: body.clientInfo.phone,
        message: smsMessage,
        status: 'simulated' // En production, intégrer avec Twilio/Orange/etc.
      })
      console.log('[BOOKING][SMS] Message simulé pour:', body.clientInfo.phone)
    }

    // WhatsApp (génération d'URL)
    if (channels.whatsapp) {
      const services = {
        'audit': 'Audit sécurité gratuit',
        'installation': 'Installation équipement',
        'maintenance': 'Maintenance préventive',
        'consultation': 'Consultation digitalisation'
      }
      
      const serviceName = services[body.service as keyof typeof services] || body.service
      const waText = `🗓️ DEMANDE DE RENDEZ-VOUS%0A%0A📋 SERVICE: ${serviceName}%0A📅 DATE: ${new Date(body.date).toLocaleDateString('fr-FR')}%0A🕐 HEURE: ${body.time}%0A📍 ADRESSE: ${body.address}%0A👤 CLIENT: ${body.clientInfo.name}%0A📞 CONTACT: ${body.clientInfo.phone}${body.clientInfo.company ? `%0A🏢 ENTREPRISE: ${body.clientInfo.company}` : ''}${body.details ? `%0A%0A📝 DÉTAILS:%0A${body.details}` : ''}%0A%0AMerci de confirmer ce rendez-vous.`
      
      const waUrl = `https://wa.me/221774133440?text=${waText}`
      events.push({ 
        type: 'whatsapp', 
        url: waUrl,
        status: 'url_generated'
      })
      console.log('[BOOKING][WHATSAPP] URL générée')
    }

    // Créer une notification pour les admins
    try {
      const notificationResponse = await fetch(`${request.nextUrl.origin}/api/notifications`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          userId: 'admin',
          type: 'info',
          title: 'Nouvelle demande de rendez-vous',
          message: `${body.clientInfo.name} a demandé un RDV pour ${body.service} le ${new Date(body.date).toLocaleDateString('fr-FR')} à ${body.time}`,
          actionUrl: '/admin-reports',
          metadata: {
            bookingId: `booking-${Date.now()}`,
            service: body.service,
            date: body.date,
            client: body.clientInfo.name
          }
        })
      })
      
      if (notificationResponse.ok) {
        console.log('[BOOKING] Notification admin créée')
      }
    } catch (notifError) {
      console.error('[BOOKING] Erreur notification admin:', notifError)
    }

    return NextResponse.json({ 
      success: true, 
      events,
      message: 'Demande de rendez-vous traitée avec succès'
    })
  } catch (error) {
    console.error('[BOOKING] Erreur serveur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}