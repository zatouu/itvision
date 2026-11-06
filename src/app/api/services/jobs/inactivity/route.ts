import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/jwt'
import { runInactivityJob } from '@/lib/mission-inactivity-job'

export async function POST(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    if (role !== 'ADMIN' && role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }
    const result = await runInactivityJob()
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/services/jobs/inactivity]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
