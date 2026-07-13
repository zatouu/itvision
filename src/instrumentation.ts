/**
 * Instrumentation Next.js — exécutée au démarrage du serveur.
 * Démarre les jobs cron de maintenance.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startMaintenanceCron } = await import('@/lib/maintenance/cron-runner')
    startMaintenanceCron()

    // Démarre le Visibility Scheduler + Recovery Scheduler (recharge les tâches
    // planifiées persistées après un redémarrage).
    const { startVisibilityScheduler } = await import('@/lib/visibility')
    startVisibilityScheduler()
  }
}
