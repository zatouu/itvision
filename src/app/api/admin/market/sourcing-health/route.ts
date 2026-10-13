/**
 * GET /api/admin/market/sourcing-health
 *   État de la recherche automatique « Trouvez-moi » : worker, sources, config, délais.
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { verifyAuthServer } from '@/lib/auth-server'
import { getAppConfig } from '@/lib/wallet'
import AgentJob from '@/lib/models/AgentJob'
import AgentDecision from '@/lib/models/AgentDecision'
import SourcingRequest from '@/lib/models/SourcingRequest'
import { ExternalSearchLog } from '@/lib/models/ExternalSearchLog'
import { staleAgentJobFilter } from '@/lib/agents/queue'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'])
const PLATFORMS = ['1688', 'aliexpress', 'alibaba'] as const
const DAY = 24 * 3600 * 1000

type Level = 'ok' | 'warn' | 'down'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (!ADMIN_ROLES.has(String(auth.user.role).toUpperCase())) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  await connectMongoose()
  const now = Date.now()
  const since7 = new Date(now - 7 * DAY)
  const since30 = new Date(now - 30 * DAY)

  const [logAgg, lastSuccess, lastProcessed, stuckJobs, cfg, requests, decisions, overdue, stalledJobs, failedNotifications, pendingNotifications] = await Promise.all([
    ExternalSearchLog.aggregate([
      { $match: { createdAt: { $gte: since7 } } },
      { $group: { _id: { platform: '$platform', status: '$status' }, count: { $sum: 1 } } },
    ]),
    ExternalSearchLog.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: '$platform', at: { $max: '$createdAt' } } },
    ]),
    AgentJob.findOne({ type: 'sourcing_request', status: { $in: ['done', 'failed', 'waiting_human'] } })
      .sort({ updatedAt: -1 }).select('updatedAt status error').lean() as any,
    AgentJob.countDocuments({ type: 'sourcing_request', status: 'pending', runAfter: { $lt: new Date(now - 30 * 60 * 1000) } }),
    getAppConfig() as Promise<any>,
    SourcingRequest.find({ createdAt: { $gte: since30 } }).select('createdAt proposalSentAt').lean() as any,
    AgentDecision.aggregate([
      { $match: { type: 'sourcing_request', createdAt: { $gte: since30 }, $or: [{ status: { $ne: 'auto_approved' } }, { 'proposal.checks.autoSent': true }] } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    SourcingRequest.countDocuments({ status: { $in: ['new', 'searching', 'proposal_ready'] }, slaDueAt: { $lt: new Date(now) } }),
    AgentJob.countDocuments(staleAgentJobFilter(['sourcing_request'], new Date(now))),
    SourcingRequest.countDocuments({ status: 'proposal_sent', 'proposalNotification.status': 'failed' }),
    SourcingRequest.countDocuments({ status: 'proposal_sent', 'proposalNotification.status': { $in: ['pending', 'sending'] } }),
  ])

  const platforms = PLATFORMS.map((p) => {
    const counts: Record<string, number> = { success: 0, blocked: 0, no_results: 0, error: 0 }
    for (const r of logAgg) if (r._id.platform === p) counts[r._id.status] = r.count
    const total = Object.values(counts).reduce((s, v) => s + v, 0)
    const successRate = total ? counts.success / total : null
    const at = lastSuccess.find((r: any) => r._id === p)?.at || null
    const level: Level = total === 0 ? 'warn' : successRate! >= 0.4 ? 'ok' : successRate! > 0 ? 'warn' : 'down'
    return { platform: p, total, counts, successRate, lastSuccessAt: at, level }
  })

  const env = process.env
  const config = {
    llm: !!(env.DEEPSEEK_API_KEY || env.QWEN_CLOUD_API_KEY || env.DASHSCOPE_API_KEY || env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || env.OLLAMA_BASE_URL),
    vision: !!(env.QWEN_CLOUD_API_KEY || env.DASHSCOPE_API_KEY || env.OLLAMA_BASE_URL),
    proxy: !!env.SCRAPER_PROXY,
    workerOnThisServer: env.AGENT_WORKER_ENABLED === 'true',
    autoSend: {
      enabled: cfg?.integrations?.sourcingAutoSend?.enabled === true,
      minRelevance: Number(cfg?.integrations?.sourcingAutoSend?.minRelevance) || 0.8,
    },
  }

  const delays = requests
    .filter((r: any) => r.proposalSentAt)
    .map((r: any) => (new Date(r.proposalSentAt).getTime() - new Date(r.createdAt).getTime()) / 3600000)
    .sort((a: number, b: number) => a - b)
  const decisionCounts: Record<string, number> = {}
  for (const d of decisions) decisionCounts[d._id] = d.count
  const reviewed = (decisionCounts.approved || 0) + (decisionCounts.rejected || 0)

  const lastProcessedAt = lastProcessed?.updatedAt || null
  const recentlyProcessed = lastProcessedAt && new Date(lastProcessedAt).getTime() >= now - 15 * 60_000
  const workerLevel: Level = stuckJobs > 0 || stalledJobs > 0 ? 'down'
    : recentlyProcessed && lastProcessed?.status !== 'failed' ? 'ok' : 'warn'

  const alerts: string[] = []
  if (stuckJobs > 0) alerts.push(`${stuckJobs} recherche(s) en attente depuis plus de 30 min : vérifier le worker et sa capacité de traitement.`)
  if (stalledJobs > 0) alerts.push(`${stalledJobs} recherche(s) sans battement depuis 15 min : reprise du worker nécessaire.`)
  if (!lastProcessedAt) alerts.push('Aucune recherche automatique n\'a encore été traitée.')
  else if (!recentlyProcessed) alerts.push('Aucun traitement récent : la présence du worker reste à confirmer.')
  if (lastProcessed?.status === 'failed') alerts.push('Le dernier traitement a échoué.')
  if (failedNotifications > 0) alerts.push(`${failedNotifications} notification(s) de proposition non transmise(s) : intervention nécessaire.`)
  if (pendingNotifications > 0) alerts.push(`${pendingNotifications} notification(s) SMS en attente de transmission ou de reprise.`)
  if (!config.llm) alerts.push('Configuration texte non détectée sur le serveur web : vérifier aussi celle du worker distant.')
  if (!config.vision) alerts.push('Configuration vision non détectée sur le serveur web : vérifier aussi celle du worker distant.')
  const p1688 = platforms[0]
  if (p1688.level === 'down') alerts.push('Aucun résultat exploitable sur 1688 dans les recherches journalisées : vérifier les motifs avant de changer le proxy.')
  if (overdue > 0) alerts.push(`${overdue} demande(s) hors délai 24h ouvrées.`)

  const level: Level =
    workerLevel === 'down' || platforms.every((p) => p.level === 'down') ? 'down'
      : alerts.length || workerLevel === 'warn' || platforms.some(platform => platform.level !== 'ok') ? 'warn' : 'ok'

  return NextResponse.json({
    success: true,
    level,
    alerts,
    worker: { level: workerLevel, lastProcessedAt, lastStatus: lastProcessed?.status || null, lastError: lastProcessed?.error || null, stuckJobs, stalledJobs },
    notifications: { pending: pendingNotifications, failed: failedNotifications },
    platforms,
    config,
    requests: {
      total30d: requests.length,
      proposalsSent30d: delays.length,
      medianDelayHours: delays.length ? Math.round(delays[Math.floor(delays.length / 2)] * 10) / 10 : null,
      overdue,
    },
    decisions: {
      autoSent: decisionCounts.auto_approved || 0,
      approved: decisionCounts.approved || 0,
      rejected: decisionCounts.rejected || 0,
      pending: decisionCounts.pending || 0,
      approvalRate: reviewed ? Math.round(((decisionCounts.approved || 0) / reviewed) * 100) : null,
    },
  })
}
