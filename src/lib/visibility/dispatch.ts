/**
 * Service de diffusion (orchestration) — relie le Visibility Scheduler au moteur.
 *
 * Flux :
 *   enqueueDispatch(requestId)
 *     → crée l'état VisibilityDispatch + planifie la vague stage 0 (immédiate)
 *   handler 'visibility_wave' (runVisibilityWave)
 *     → vérifie les conditions d'arrêt, sélectionne les prestataires du palier,
 *       notifie (socket+push), journalise, puis planifie le palier suivant.
 *   onOffer(requestId) → incrémente le compteur d'offres (arrête l'escalade au
 *       prochain palier via shouldStopBeforeStage).
 *   closeDispatch(requestId) → stoppe l'escalade (mission assignée/annulée).
 *
 * Aucune logique de décision ici : elle est déléguée au moteur pur (engine.ts)
 * et au ranking (ranking.ts). Ce module ne fait que de l'IO + orchestration.
 */

import mongoose from 'mongoose'
import ServiceRequest from '../models/ServiceRequest'
import VisibilityDispatch from '../models/VisibilityDispatch'
import { IScheduledTask, ScheduledTaskType } from '../models/ScheduledTask'
import { connectMongoose } from '../mongoose'
import { getVisibilityConfig } from './config'
import { getCandidates } from './presence'
import { filterAndRank, selectStageProviders, shouldStopBeforeStage } from './engine'
import { notifyWave } from './notification-engine'
import { getScheduler } from './scheduler'
import { DispatchRequestContext } from './types'

const WAVE: ScheduledTaskType = 'visibility_wave'

/**
 * Enregistre les handlers et démarre le scheduler (idempotent, via flags globaux).
 * Appelé au boot (instrumentation) ET à la première diffusion, pour être robuste
 * quel que soit le contexte d'exécution (custom server / route Next).
 */
export function ensureVisibilityStarted(): void {
  const g = global as any
  const scheduler = getScheduler()
  if (!g.__visibilityHandlersRegistered) {
    scheduler.register(WAVE, runVisibilityWave)
    g.__visibilityHandlersRegistered = true
  }
  if (!g.__visibilityStarted) {
    scheduler.start()
    g.__visibilityStarted = true
  }
}

function reqContext(req: any): DispatchRequestContext {
  const [lng, lat] = req.location?.coordinates || []
  return {
    requestId: String(req._id),
    clientId: String(req.clientId),
    category: req.category,
    location: { lat: Number(lat), lng: Number(lng) },
    budget: req.budget ?? null,
    description: req.description ?? null,
    createdAt: req.createdAt ? new Date(req.createdAt) : new Date(),
  }
}

/** Démarre la diffusion d'une mission : crée l'état + planifie la 1re vague. */
export async function enqueueDispatch(requestId: string): Promise<boolean> {
  await connectMongoose()
  ensureVisibilityStarted()
  const config = await getVisibilityConfig()
  if (!config.enabled) {
    console.log('[Visibility] désactivé (config.enabled=false) — dispatch ignoré')
    return false
  }

  const req = await ServiceRequest.findById(requestId).lean() as any
  if (!req) return false
  const [lng, lat] = req.location?.coordinates || []
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    console.warn('[Visibility] coordonnées manquantes, dispatch impossible pour', requestId)
    return false
  }

  await VisibilityDispatch.findOneAndUpdate(
    { requestId: new mongoose.Types.ObjectId(requestId) },
    {
      $setOnInsert: {
        requestId: new mongoose.Types.ObjectId(requestId),
        clientId: String(req.clientId),
        category: req.category,
        location: { lat: Number(lat), lng: Number(lng) },
        status: 'active',
        currentStage: -1,
        offersReceived: 0,
        providersNotified: [],
        totalNotified: 0,
        waves: [],
      },
    },
    { upsert: true, new: true },
  )

  await getScheduler().schedule({ type: WAVE, requestId, stage: 0, runAt: new Date() })
  console.log(`[Visibility] dispatch enqueued req=${requestId} loc=${lat.toFixed(5)},${lng.toFixed(5)} cat=${req.category}`)
  return true
}

/** Handler de vague d'escalade. */
export async function runVisibilityWave(task: IScheduledTask): Promise<void> {
  await connectMongoose()
  const requestId = String(task.requestId)
  const stageIndex = task.stage ?? 0

  const dispatch = await VisibilityDispatch.findOne({ requestId: new mongoose.Types.ObjectId(requestId) })
  if (!dispatch || dispatch.status !== 'active') return

  const req = await ServiceRequest.findById(requestId).lean() as any
  if (!req || !['created', 'pending_offers'].includes(req.status)) {
    dispatch.status = 'completed'
    dispatch.stopReason = 'request_closed'
    dispatch.nextRunAt = undefined
    await dispatch.save()
    return
  }

  const config = await getVisibilityConfig()

  // Condition d'arrêt AVANT ce palier (assez d'offres ou assez de prestataires notifiés).
  if (shouldStopBeforeStage(config, stageIndex, dispatch.offersReceived, dispatch.totalNotified)) {
    dispatch.status = 'stopped'
    dispatch.stopReason = dispatch.offersReceived >= (config.escalation[stageIndex]?.minOffersToStop ?? 1)
      ? 'enough_offers' : 'enough_providers'
    dispatch.nextRunAt = undefined
    await dispatch.save()
    console.log(`[Visibility] escalade stoppée (${dispatch.stopReason}) req=${requestId} stage=${stageIndex}`)
    return
  }

  const stage = config.escalation[stageIndex]
  if (!stage) return

  const ctx = reqContext(req)
  const candidates = await getCandidates(dispatch.location, stage.radiusKm, config)
  const { ranked: rankedEligible, reasons } = filterAndRank(candidates, ctx, config)

  if (candidates.length === 0) {
    console.log(`[Visibility] req=${requestId} stage=${stageIndex} radius=${stage.radiusKm}km → 0 candidate (no presence)`)
  } else {
    const ineligible = Object.entries(reasons).map(([id, r]) => `${id}:${r}`).join(', ')
    console.log(`[Visibility] req=${requestId} stage=${stageIndex} radius=${stage.radiusKm}km → ${candidates.length} candidate(s), ${rankedEligible.length} eligible | ineligible=${ineligible || 'none'}`)
  }

  const alreadyNotified = new Set<string>(dispatch.providersNotified)
  const selection = selectStageProviders(config, stageIndex, rankedEligible, alreadyNotified)

  const result = await notifyWave({
    request: ctx,
    stage: selection.stage,
    radiusKm: selection.radiusKm,
    providerIds: selection.providerIds,
  })

  // Planifier le palier suivant s'il existe.
  const nextIndex = stageIndex + 1
  const nextStage = config.escalation[nextIndex]
  const nextRunAt = nextStage ? new Date(Date.now() + nextStage.delaySec * 1000) : undefined

  dispatch.waves.push({
    stage: result.stage,
    radiusKm: result.radiusKm,
    at: new Date(),
    providerIds: result.providerIds,
    socketCount: result.socketCount,
    pushDelivered: result.pushDelivered,
    pushTokenCount: result.pushTokenCount,
  })
  for (const id of result.providerIds) {
    if (!dispatch.providersNotified.includes(id)) dispatch.providersNotified.push(id)
  }
  dispatch.totalNotified = dispatch.providersNotified.length
  dispatch.currentStage = stageIndex
  dispatch.nextRunAt = nextRunAt
  await dispatch.save()

  if (nextStage) {
    await getScheduler().schedule({ type: WAVE, requestId, stage: nextIndex, runAt: nextRunAt! })
  }
}

/** Incrémente le compteur d'offres reçues (l'escalade s'arrêtera au prochain palier). */
export async function onOffer(requestId: string): Promise<void> {
  try {
    await connectMongoose()
    await VisibilityDispatch.updateOne(
      { requestId: new mongoose.Types.ObjectId(requestId), status: 'active' },
      { $inc: { offersReceived: 1 } },
    )
  } catch (err: any) {
    console.warn('[Visibility] onOffer error:', err?.message)
  }
}

/** Ferme la diffusion (mission assignée/annulée/expirée) et annule les vagues restantes. */
export async function closeDispatch(requestId: string, reason = 'closed'): Promise<void> {
  try {
    await connectMongoose()
    await getScheduler().cancelForRequest(requestId, [WAVE])
    await VisibilityDispatch.updateOne(
      { requestId: new mongoose.Types.ObjectId(requestId), status: 'active' },
      { $set: { status: 'completed', stopReason: reason, nextRunAt: null } },
    )
  } catch (err: any) {
    console.warn('[Visibility] closeDispatch error:', err?.message)
  }
}
