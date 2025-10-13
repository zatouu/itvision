import { NextRequest, NextResponse } from 'next/server'

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

    // Stubs d’envoi: en prod, intégrer email/SMS providers
    const events: any[] = []

    if (channels.email && body.clientInfo.email) {
      events.push({
        type: 'email',
        to: body.clientInfo.email,
        subject: `Confirmation RDV IT Vision - ${body.service}`,
        payload: {
          service: body.service,
          date: body.date,
          time: body.time,
          address: body.address,
          name: body.clientInfo.name,
        }
      })
      // TODO: nodemailer integration (transport)
      console.log('[BOOKING][EMAIL]', JSON.stringify(events[events.length - 1]))
    }

    if (channels.sms) {
      events.push({
        type: 'sms',
        to: body.clientInfo.phone,
        message: `RDV IT Vision confirmé: ${body.service} le ${body.date} à ${body.time}, adresse: ${body.address}`
      })
      // TODO: SMS provider integration (Twilio, etc.)
      console.log('[BOOKING][SMS]', JSON.stringify(events[events.length - 1]))
    }

    if (channels.whatsapp) {
      const waText = `RDV IT Vision: ${body.service}%0A${body.date} ${body.time}%0AAdresse: ${body.address}%0AClient: ${body.clientInfo.name}`
      const waUrl = `https://wa.me/${encodeURIComponent(body.clientInfo.phone)}?text=${waText}`
      events.push({ type: 'whatsapp', url: waUrl })
      console.log('[BOOKING][WHATSAPP]', JSON.stringify(events[events.length - 1]))
    }

    return NextResponse.json({ success: true, events })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
