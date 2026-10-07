import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import { buildJournals, journalsToCsv, summarizeJournals, JOURNALS, type JournalCode } from '@/lib/finance/accounting-export'

const parseDay = (v: string | null, endOfDay = false) => {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(`${v}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
  return isNaN(d.getTime()) ? null : d
}

/**
 * GET /api/admin/accounting-export?start=AAAA-MM-JJ&end=AAAA-MM-JJ&journals=VT,AC,BQ&format=csv|json
 * json = aperçu (totaux par journal), csv = fichier d'écritures à importer dans le logiciel comptable.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(request.url)
    const start = parseDay(searchParams.get('start'))
    const end = parseDay(searchParams.get('end'), true)
    if (!start || !end || start > end) return NextResponse.json({ error: 'Période invalide' }, { status: 400 })
    if (end.getTime() - start.getTime() > 3 * 366 * 24 * 3600 * 1000) {
      return NextResponse.json({ error: 'Période limitée à 3 ans' }, { status: 400 })
    }
    const journals = (searchParams.get('journals') || 'VT,AC,BQ').split(',').filter((j): j is JournalCode => j in JOURNALS)
    if (!journals.length) return NextResponse.json({ error: 'Aucun journal sélectionné' }, { status: 400 })

    await connectMongoose()
    const lines = await buildJournals(start, end, journals)

    if (searchParams.get('format') === 'csv') {
      const filename = `ecritures_${journals.join('-')}_${searchParams.get('start')}_${searchParams.get('end')}.csv`
      return new NextResponse(journalsToCsv(lines), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }
    return NextResponse.json({ summary: summarizeJournals(lines).filter(s => journals.includes(s.code)), preview: lines.slice(0, 50) })
  } catch (error) {
    console.error('Erreur GET /api/admin/accounting-export:', error)
    return NextResponse.json({ error: "Erreur lors de l'export comptable" }, { status: 500 })
  }
}
