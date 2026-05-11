import { schedule, ScheduledTask, validate } from 'node-cron'

import { runPreventiveVisitsJob, JOB_NAME as JOB_PREVENTIVE } from './jobs/preventive-visits'
import { runRenewalRemindersJob, JOB_NAME as JOB_RENEWAL } from './jobs/renewal-reminders'
import { runSLAMonitoringJob, JOB_NAME as JOB_SLA } from './jobs/sla-monitoring'

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
      console.log(`[CRON] ▶ ${job.name} démarré à ${new Date().toISOString()}`)

      try {
        const result = await job.task()
        const duration = Date.now() - start
        console.log(`[CRON] ✔ ${job.name} terminé en ${duration}ms`, result)
      } catch (error: any) {
        console.error(`[CRON] ✘ ${job.name} échoué:`, error.message)
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
