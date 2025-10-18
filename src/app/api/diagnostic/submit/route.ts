import { NextRequest, NextResponse } from 'next/server'
import emailService from '@/lib/email-service'
import { addNotification } from '@/lib/notifications-memory'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Envoi email admin (ou log si non configuré)
    await emailService.sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@example.com',
      subject: `🧩 Nouveau diagnostic de digitalisation - ${body?.contact?.company || 'Prospect'}`,
      html: `
        <h2>Nouveau diagnostic</h2>
        <pre style="white-space:pre-wrap">${escapeHtml(JSON.stringify(body, null, 2))}</pre>
      `,
    })

    // Notification in-app pour les admins
    addNotification({
      userId: 'admin',
      type: 'info',
      title: 'Nouveau diagnostic soumis',
      message: `${body?.contact?.company || body?.contact?.name || 'Prospect'} a soumis un diagnostic`,
      actionUrl: '/validation-rapports',
      metadata: { kind: 'diagnostic', sector: body?.sector, score: body?.scoring?.score }
    })

    // Accusé pour le visiteur si email fourni
    if (body?.contact?.email) {
      await emailService.sendEmail({
        to: body.contact.email,
        subject: '✅ Votre demande de diagnostic a bien été reçue',
        html: `
          <p>Bonjour ${body?.contact?.name || ''},</p>
          <p>Nous avons bien reçu votre demande de diagnostic. Notre équipe vous recontacte très vite.</p>
          <p><strong>Récapitulatif rapide:</strong></p>
          <pre style="white-space:pre-wrap">${escapeHtml(JSON.stringify({ sector: body.sector, objectives: body.objectives, processes: body.processes, scoring: body.scoring }, null, 2))}</pre>
          <p>IT Vision Plus</p>
        `,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Diagnostic submit error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
