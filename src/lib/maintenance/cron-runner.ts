import { schedule, ScheduledTask, validate } from 'node-cron'
import { runOncePerSlot } from '@/lib/cron-lock'
import { logger } from '@/lib/logger'

const log = logger.child({ category: 'job' })

import { runPreventiveVisitsJob, JOB_NAME as JOB_PREVENTIVE } from './jobs/preventive-visits'
import { runRenewalRemindersJob, JOB_NAME as JOB_RENEWAL } from './jobs/renewal-reminders'
import { runSLAMonitoringJob, JOB_NAME as JOB_SLA } from './jobs/sla-monitoring'
import { runCorporateAgentsJob, JOB_NAME as JOB_CORPORATE_AGENTS } from './jobs/corporate-agents'
import { runInvoiceRemindersJob, JOB_NAME as JOB_INVOICE_REMINDERS } from './jobs/invoice-reminders'
import { runContractBillingJob, JOB_NAME as JOB_CONTRACT_BILLING } from './jobs/contract-billing'

type JobDefinition = {
  name: string
  schedule: string
  task: () => Promise<any>
  enabled: boolean
}

const jobs: JobDefinition[] = [
  {
    name: JOB_PREVENTIVE,
    schedule: '0 6 * * *',
    task: runPreventiveVisitsJob,
    enabled: process.env.MAINTENANCE_CRON_PREVENTIVE !== 'false'
  },
  {
    name: JOB_RENEWAL,
    schedule: '0 8 * * *',
    task: runRenewalRemindersJob,
    enabled: process.env.MAINTENANCE_CRON_RENEWAL !== 'false'
  },
  {
    name: JOB_SLA,
    schedule: '*/15 * * * *',
    task: runSLAMonitoringJob,
    enabled: process.env.MAINTENANCE_CRON_SLA !== 'false'
  },
  {
    // Agents corporate : renouvellements + digests clients (lundi 7h)
    name: JOB_CORPORATE_AGENTS,
    schedule: '0 7 * * 1',
    task: runCorporateAgentsJob,
    enabled: process.env.MAINTENANCE_CRON_CORPORATE_AGENTS !== 'false'
  },
  {
    // Relances clients des factures (emails sortants) : activation explicite
    name: JOB_INVOICE_REMINDERS,
    schedule: '0 9 * * 1-5',
    task: runInvoiceRemindersJob,
    enabled: process.env.INVOICE_REMINDERS_ENABLED === 'true'
  },
  {
    // Factures brouillon des échéances de contrats (autoBilling) : activation explicite
    name: JOB_CONTRACT_BILLING,
    schedule: '30 6 * * *',
    task: runContractBillingJob,
    enabled: process.env.CONTRACT_BILLING_ENABLED === 'true'
  }
]

const scheduledTasks: ScheduledTask[] = []

export function startMaintenanceCron(): void {
  if (process.env.MAINTENANCE_CRON_DISABLED === 'true') {
    console.log('[CRON] Jobs maintenance désactivés via MAINTENANCE_CRON_DISABLED=true')
    return
  }

  for (const job of jobs) {
    if (!job.enabled) {
      console.log(`[CRON] ${job.name} désactivé`)
      continue
    }

    if (!validate(job.schedule)) {
      console.error(`[CRON] Schedule invalide pour ${job.name}: ${job.schedule}`)
      continue
    }

    const task = schedule(job.schedule, async () => {
      const start = Date.now()

      try {
        // Une seule instance par créneau (verrou plus court que la plus petite période : 15 min)
        const result = await runOncePerSlot(`maintenance:${job.name}`, 10 * 60, async () => {
          log.info('job_started', { job: job.name })
          return job.task()
        })
        if (result === undefined) return
        log.info('job_finished', { job: job.name, durationMs: Date.now() - start, result })
      } catch (error: any) {
        log.error('job_failed', { job: job.name, durationMs: Date.now() - start, err: error })
      }
    }, {
      timezone: 'UTC'
    })

    scheduledTasks.push(task)
    console.log(`[CRON] ${job.name} planifié — ${job.schedule}`)
  }

  console.log(`[CRON] ${scheduledTasks.length} job(s) maintenance actif(s)`)
}

export function stopMaintenanceCron(): void {
  for (const task of scheduledTasks) {
    task.stop()
  }
  scheduledTasks.length = 0
  console.log('[CRON] Tous les jobs maintenance arrêtés')
}

export function getMaintenanceCronStatus(): { name: string; schedule: string; enabled: boolean }[] {
  return jobs.map((j) => ({ name: j.name, schedule: j.schedule, enabled: j.enabled }))
}
