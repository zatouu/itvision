/**
 * Job cron — agents corporate hebdomadaires.
 *
 * - `contract_renewal` : enfile un job par contrat actif expirant sous 60 j
 *   (l'agent prépare la proposition de renouvellement → validation admin).
 * - `client_digest` : enfile un job par société cliente ayant de l'activité
 *   (digest hebdomadaire poussé aux owner/admin).
 *
 * Le worker (`AGENT_WORKER_ENABLED=true`) consomme la file — ce job ne fait
 * qu'alimenter `AgentJob`, comme les routes métier.
 */

import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Client from '@/lib/models/Client'
import AgentJob from '@/lib/models/AgentJob'
import { enqueueAgentJob } from '@/lib/agents/queue'

export const JOB_NAME = 'maintenance.corporate-agents'

interface CorporateAgentsResult {
  renewalJobs: number
  digestJobs: number
  errors: string[]
}

const RENEWAL_HORIZON_DAYS = 60
const DIGEST_ACTIVITY_DAYS = 7

async function enqueueIfIdle(type: 'contract_renewal' | 'client_digest', refId: string): Promise<boolean> {
  const active = await AgentJob.findOne({
    type,
    refId,
    status: { $in: ['pending', 'running', 'waiting_human'] },
  }).select('_id').lean()
  if (active) return false

  // Fenêtre anti-doublon : pas de nouveau digest/renouvellement dans les 6 jours
  const recent = await AgentJob.findOne({
    type,
    refId,
    createdAt: { $gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
  }).select('_id').lean()
  if (recent) return false

  await enqueueAgentJob(type, refId)
  return true
}

export async function runCorporateAgentsJob(): Promise<CorporateAgentsResult> {
  const errors: string[] = []
  let renewalJobs = 0
  let digestJobs = 0

  try {
    await connectMongoose()

    // 1. Renouvellements : contrats actifs arrivant à échéance
    const contracts = await MaintenanceContract.find({
      status: 'active',
      endDate: { $gte: new Date(), $lte: new Date(Date.now() + RENEWAL_HORIZON_DAYS * 24 * 60 * 60 * 1000) },
    }).select('_id').limit(50).lean() as any[]

    for (const contract of contracts) {
      try {
        if (await enqueueIfIdle('contract_renewal', String(contract._id))) renewalJobs++
      } catch (e: any) {
        errors.push(`contract ${contract._id}: ${e?.message}`)
      }
    }

    // 2. Digests : sociétés avec de l'activité récente
    const since = new Date(Date.now() - DIGEST_ACTIVITY_DAYS * 24 * 60 * 60 * 1000)
    const companies = await Client.find({
      isActive: { $ne: false },
      'permissions.canAccessPortal': { $ne: false },
      updatedAt: { $gte: since },
    }).select('_id').limit(100).lean() as any[]

    for (const company of companies) {
      try {
        if (await enqueueIfIdle('client_digest', String(company._id))) digestJobs++
      } catch (e: any) {
        errors.push(`company ${company._id}: ${e?.message}`)
      }
    }
  } catch (e: any) {
    errors.push(e?.message || 'erreur inconnue')
  }

  return { renewalJobs, digestJobs, errors }
}
