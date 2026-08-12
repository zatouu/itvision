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

    // Jobs lifecycle des missions/offres (déménagés de server.js car src/lib est
    // TS — Next.js runtime les compile/bundle correctement en production).
    const { runInactivityJob, expireOldOffers } = await import('@/lib/mission-inactivity-job')
    const { schedule: scheduleCron } = await import('node-cron')

    scheduleCron('0 * * * *', async () => {
      try {
        await runInactivityJob()
      } catch (err: any) {
        console.error('[cron] inactivity job', err)
      }
    })
    console.log('⏰ Inactivity job planifié (toutes les heures)')

    setInterval(async () => {
      try {
        await expireOldOffers(new Date())
      } catch (err: any) {
        console.error('[server] offer expiration interval', err)
      }
    }, 5 * 60 * 1000)

    // Payment sweeper — réconciliation des paiements pending (fallback webhook)
    const { startPaymentSweeper } = await import('@/lib/payment-sweeper')
    startPaymentSweeper()
  }
}
