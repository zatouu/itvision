/**
 * Instrumentation Next.js — exécutée au démarrage du serveur.
 * Démarre les jobs cron de maintenance.
 */

/** Toute erreur serveur non rattrapée (page, route API, action, middleware) → une ligne JSON pour ELK. */
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: string; routePath: string; routeType: string }
) {
  const [{ logger }, { getDomainForPath }] = await Promise.all([import('@/lib/logger'), import('@/lib/domains')])
  const path = request.path.split('?')[0]
  const header = (name: string) => {
    const v = request.headers[name]
    return Array.isArray(v) ? v[0] : v
  }
  logger.error('request_error', {
    category: 'web',
    domain: getDomainForPath(path) || 'unknown',
    method: request.method,
    path,
    route: context.routePath,
    routeType: context.routeType,
    requestId: header('x-request-id'),
    userAgent: header('user-agent'),
    err,
  })
  if (process.env.SENTRY_DSN) {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureRequestError(err, request, context)
  }
}

export async function register() {
  // Sentry serveur et edge : inactif sans DSN, aucune donnée personnelle envoyée (sendDefaultPii false)
  if (process.env.SENTRY_DSN) {
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
      sendDefaultPii: false,
    })
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Enregistre le taux de change admin avant tout calcul de prix catalogue
    await import('@/lib/pricing/settings')

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
    // Une seule instance par créneau si plusieurs conteneurs tournent (Redis), sinon exécution locale
    const { runOncePerSlot } = await import('@/lib/cron-lock')

    scheduleCron('0 * * * *', async () => {
      try {
        await runOncePerSlot('inactivity', 50 * 60, runInactivityJob)
      } catch (err: any) {
        console.error('[cron] inactivity job', err)
      }
    })
    console.log('⏰ Inactivity job planifié (toutes les heures)')

    // DDM+ : commandes impayées expirées et achats groupés arrivés à échéance (idempotents)
    scheduleCron('20 * * * *', () => runOncePerSlot('ddm-expirations', 50 * 60, async () => {
      try {
        const { connectMongoose } = await import('@/lib/mongoose')
        const { expireUnpaidOrders } = await import('@/lib/market/order-expiry')
        const { closeExpiredGroups, remindInterestedVisitors } = await import('@/lib/group-orders/expiry')
        const { autoCompleteVerifiedTransactions } = await import('@/lib/escrow-service')
        await connectMongoose()
        const expired = await expireUnpaidOrders()
        await remindInterestedVisitors()
        const groups = await closeExpiredGroups()
        await autoCompleteVerifiedTransactions()
        // Agent IA : groupes qui ferment sous 48 h sans minimum → proposition de sauvetage (décision admin)
        const { scanGroupsAtRisk } = await import('@/lib/agents/market/group-rescue-run')
        await scanGroupsAtRisk().catch((e: any) => console.error('[cron] scan groupes à risque', e))
        // Agent autonome : relances impayés, vendeurs en retard, escalades admin (messages uniquement)
        const { runOrderSlaWatchdog } = await import('@/lib/agents/market/order-sla-watchdog')
        await runOrderSlaWatchdog().catch((e: any) => console.error('[cron] gardien des délais', e))
        if (expired || groups.filled || groups.cancelled) {
          console.log(`[cron] DDM+ : ${expired} commande(s) impayée(s) annulée(s), groupes clos ${groups.filled} validé(s) / ${groups.cancelled} annulé(s)`)
        }
      } catch (err: any) {
        console.error('[cron] DDM+ expirations', err)
      }
    }))

    // Agent IA quotidien : produits avec une demande latente → proposition d'achat groupé (décision admin)
    scheduleCron('30 8 * * *', () => runOncePerSlot('ddm-group-seeding', 60 * 60, async () => {
      try {
        const { connectMongoose } = await import('@/lib/mongoose')
        const { scanGroupSeedCandidates } = await import('@/lib/agents/market/group-seeding-run')
        await connectMongoose()
        const queued = await scanGroupSeedCandidates()
        if (queued) console.log(`[cron] DDM+ : ${queued} produit(s) analysé(s) pour un achat groupé`)
      } catch (err: any) {
        console.error('[cron] DDM+ amorçage achats groupés', err)
      }
    }))

    setInterval(async () => {
      try {
        await runOncePerSlot('offer-expiration', 4 * 60, () => expireOldOffers(new Date()))
      } catch (err: any) {
        console.error('[server] offer expiration interval', err)
      }
    }, 5 * 60 * 1000)

    // Factures envoyées dont l'échéance est dépassée → "overdue" (idempotent, sans risque en multi-instance)
    scheduleCron('15 6 * * *', () => runOncePerSlot('overdue-invoices', 60 * 60, async () => {
      try {
        const { connectMongoose } = await import('@/lib/mongoose')
        const { markOverdueInvoices } = await import('@/lib/finance/billing')
        await connectMongoose()
        const count = await markOverdueInvoices()
        if (count > 0) console.log(`[cron] ${count} facture(s) passée(s) en retard`)
      } catch (err: any) {
        console.error('[cron] overdue invoices', err)
      }
    }), { timezone: 'Africa/Dakar' })

    // Xeuy : rappel hebdomadaire des consommables sous leur seuil (« Mon stock »), lundi 8h
    scheduleCron('0 8 * * 1', () => runOncePerSlot('xeuy-stock-reminder', 60 * 60, async () => {
      try {
        const { connectMongoose } = await import('@/lib/mongoose')
        const { remindLowStock } = await import('@/modules/xeuy/stock-reminder')
        await connectMongoose()
        const sent = await remindLowStock()
        if (sent > 0) console.log(`[cron] ${sent} rappel(s) de stock envoyé(s)`)
      } catch (err: any) {
        console.error('[cron] rappel stock prestataires', err)
      }
    }), { timezone: 'Africa/Dakar' })

    // Payment sweeper — réconciliation des paiements pending (fallback webhook)
    const { startPaymentSweeper } = await import('@/lib/payment-sweeper')
    startPaymentSweeper()

    // Worker agents IA (LangGraph) — actif si AGENT_WORKER_ENABLED=true
    const { startAgentWorker } = await import('@/lib/agents/worker')
    startAgentWorker()
  }
}
