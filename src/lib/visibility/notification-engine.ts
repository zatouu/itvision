/**
 * NotificationEngine (IO)
 *
 * Point d'entrée UNIQUE pour notifier un ensemble de prestataires d'une mission.
 * Unifie les deux canaux jusqu'ici dispersés :
 *   - temps réel Socket.IO (room `provider-{userId}`) via global.io
 *   - push Expo (sendPushToUsers) — persiste aussi une notification in-app
 *
 * Retourne un résultat détaillé pour l'audit (VisibilityDispatch.waves).
 */

import { sendPushToUsers } from '../push'
import { DispatchRequestContext, WaveDispatchResult } from './types'

export interface NotifyWaveInput {
  request: DispatchRequestContext
  stage: number
  radiusKm: number
  providerIds: string[]
}

function buildRealtimePayload(req: DispatchRequestContext, stage: number, radiusKm: number) {
  return {
    requestId: req.requestId,
    category: req.category,
    description: req.description || '',
    budget: req.budget ?? null,
    location: {
      type: 'Point',
      coordinates: [req.location.lng, req.location.lat],
    },
    createdAt: req.createdAt,
    _visibility: { stage, radiusKm },
  }
}

/** Notifie une vague de prestataires (socket + push). Idempotent côté appelant (dédup en amont). */
export async function notifyWave(input: NotifyWaveInput): Promise<WaveDispatchResult> {
  const { request, stage, radiusKm, providerIds } = input
  const uniqueIds = Array.from(new Set(providerIds))

  let socketCount = 0
  let pushDelivered = 0
  let pushTokenCount = 0

  if (uniqueIds.length === 0) {
    return { stage, radiusKm, providerIds: uniqueIds, socketCount, pushDelivered, pushTokenCount }
  }

  // 1) Temps réel Socket.IO
  const io = (global as any).io
  if (io && typeof io.to === 'function') {
    const payload = buildRealtimePayload(request, stage, radiusKm)
    for (const id of uniqueIds) {
      try {
        io.to(`provider-${id}`).emit('request:nearby', payload)
        socketCount++
      } catch (err: any) {
        console.warn(`[Visibility] socket emit failed for ${id}:`, err?.message)
      }
    }
  }

  // 2) Push Expo (best-effort ; persiste une notification in-app)
  try {
    const results = await sendPushToUsers(uniqueIds, {
      title: '🔔 Nouvelle demande',
      body: `${request.category} — ${(request.description || '').slice(0, 80) || 'Sans description'}`,
      data: { type: 'request:new', requestId: request.requestId },
      channelId: 'services',
      appType: 'provider',
    })
    for (const r of results) {
      pushDelivered += r.deliveredCount || 0
      pushTokenCount += r.tokenCount || 0
    }
  } catch (err: any) {
    console.warn('[Visibility] push wave failed:', err?.message)
  }

  console.log(`[Visibility] wave requestId=${request.requestId} stage=${stage} radius=${radiusKm}km → ${uniqueIds.length} provider(s) | socket=${socketCount} pushDelivered=${pushDelivered}`)
  return { stage, radiusKm, providerIds: uniqueIds, socketCount, pushDelivered, pushTokenCount }
}
