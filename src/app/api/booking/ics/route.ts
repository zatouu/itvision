import { NextRequest, NextResponse } from 'next/server'

function formatDateTimeToICS(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) + 'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) + 'Z'
  )
}

function parseLocalDateTime(input: string): Date | null {
  // Expecting 'YYYY-MM-DDTHH:mm'
  if (!input) return null
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, y, m, d, hh, mm] = match
  // Africa/Dakar is UTC+0 (no DST) — treat as UTC to simplify
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0))
  return date
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || 'Rendez-vous IT Vision'
    const description = searchParams.get('description') || ''
    const location = searchParams.get('location') || ''
    const start = searchParams.get('start') // 'YYYY-MM-DDTHH:mm'
    const end = searchParams.get('end') // 'YYYY-MM-DDTHH:mm'

    const startDate = parseLocalDateTime(start || '')
    const endDate = parseLocalDateTime(end || '')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Paramètres start/end invalides. Format attendu: YYYY-MM-DDTHH:mm' }, { status: 400 })
    }

    const now = new Date()
    const uid = `${now.getTime()}-${Math.random().toString(36).slice(2)}@itvision.sn`
    const dtStamp = formatDateTimeToICS(now)
    const dtStart = formatDateTimeToICS(startDate)
    const dtEnd = formatDateTimeToICS(endDate)

    const ics = [
      'BEGIN:VCALENDAR',
      'PRODID:-//IT Vision//Rendez-vous//FR',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      `LOCATION:${location.replace(/\n/g, ' ')}`,
      'END:VEVENT',
      'END:VCALENDAR',
      ''
    ].join('\r\n')

    const response = new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="rdv-it-vision.ics"',
        'Cache-Control': 'no-store'
      }
    })
    return response
  } catch (e) {
    return NextResponse.json({ error: 'Erreur génération ICS' }, { status: 500 })
  }
}
