import { NextRequest, NextResponse } from 'next/server'
import { runPreventiveVisitsJob } from '@/lib/maintenance/jobs/preventive-visits'
import { runRenewalRemindersJob } from '@/lib/maintenance/jobs/renewal-reminders'
import { runSLAMonitoringJob } from '@/lib/maintenance/jobs/sla-monitoring'
import { getMaintenanceCronStatus } from '@/lib/maintenance/cron-runner'

const VALID_JOBS = ['preventive-visits', 'renewal-reminders', 'sla-monitoring']

function requireCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret') || ''
  const expected = process.env.CRON_SECRET || ''
  if (!expected) {
    console.warn('[CRON API] CRON_SECRET non configuré — appel refusé')
    return false
  }
  return secret === expected
}

/**
 * GET /api/cron/maintenance
 * Retourne le statut des jobs (protégé par CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  if (!requireCronSecret(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  return NextResponse.json({
    status: 'ok',
    jobs: getMaintenanceCronStatus()
  })
}

/**
 * POST /api/cron/maintenance
 * Déclenche manuellement un job de maintenance.
 * Body: { job: 'preventive-visits' | 'renewal-reminders' | 'sla-monitoring' }
 */
export async function POST(request: NextRequest) {
  if (!requireCronSecret(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const { job } = body || {}
  if (!VALID_JOBS.includes(job)) {
    return NextResponse.json(
      { error: `Job invalide. Attendu: ${VALID_JOBS.join(', ')}` },
      { status: 400 }
    )
  }

  const start = Date.now()
  try {
    let result: any
    switch (job) {
      case 'preventive-visits':
        result = await runPreventiveVisitsJob()
        break
      case 'renewal-reminders':
        result = await runRenewalRemindersJob()
        break
      case 'sla-monitoring':
        result = await runSLAMonitoringJob()
        break
    }

    return NextResponse.json({
      success: true,
      job,
      durationMs: Date.now() - start,
      result
    })
  } catch (error: any) {
    console.error(`[CRON API] Échec job ${job}:`, error)
    return NextResponse.json(
      { error: 'Échec du job', details: error.message },
      { status: 500 }
    )
  }
}
