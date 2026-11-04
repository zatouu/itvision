import ServiceRequest from '../models/ServiceRequest'
import Offer from '../models/Offer'
import { aiAssist, type StructuredAdvice, type MissionContext } from './assist'
import { getAiConfig } from './entitlement'

/**
 * Coach IA prestataire — généré automatiquement à chaque changement d'étape
 * de mission (appelé en fire-and-forget depuis mission-lifecycle).
 *
 * - Feature 'mission_coach' (admin → config IA), gratuite par défaut car
 *   déclenchée par le système et non par l'utilisateur (AI_AUTO_FEATURES).
 * - Le résultat est mis en cache dans ServiceRequest.aiCoach[status] pour ne
 *   pas re-générer (et re-facturer en tokens) à chaque re-connexion.
 * - La fiche est poussée au prestataire via le socket 'ai:advice_updated'.
 */

/** Statuts pour lesquels une fiche coach est générée. */
const COACHED_STATUSES = ['accepted', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'awaiting_validation']

interface CachedCoach {
  advice: StructuredAdvice
  generatedAt: string
  model: string
}

function readCache(sr: any, status: string): CachedCoach | null {
  const entry = sr?.aiCoach?.[status]
  if (entry && entry.advice && typeof entry.advice.title === 'string') return entry as CachedCoach
  return null
}

function emitCoach(sr: any, status: string, entry: CachedCoach) {
  const io = (global as any).io
  if (!io) return
  const payload = {
    requestId: String(sr._id),
    status,
    // Chaîne courte pour la carte (AiAdviceCard) + fiche complète pour le détail
    advice: entry.advice.summary || entry.advice.title,
    coach: entry.advice,
    generatedAt: entry.generatedAt,
  }
  io.to(`request-${String(sr._id)}`).emit('ai:advice_updated', payload)
  if (sr.assignedProviderId) {
    io.to(`provider-${String(sr.assignedProviderId)}`).emit('ai:advice_updated', payload)
  }
}

async function buildMissionContext(sr: any): Promise<MissionContext> {
  const pauseLog: any[] = Array.isArray(sr.pauseLog) ? sr.pauseLog : []
  const lastPause = pauseLog[pauseLog.length - 1]
  const startRef = sr.startedAt || sr.assignedAt || sr.createdAt
  const elapsedMinutes = startRef ? Math.max(0, Math.round((Date.now() - new Date(startRef).getTime()) / 60000)) : undefined

  let price: number | undefined
  if (sr.selectedOfferId) {
    const offer = await Offer.findById(sr.selectedOfferId).select('price').lean() as any
    if (typeof offer?.price === 'number' && offer.price > 0) price = offer.price
  }

  return {
    subcategory: typeof sr.subcategory === 'string' ? sr.subcategory : undefined,
    clientImageCount: Array.isArray(sr.media) ? sr.media.filter((m: any) => m && (m.type || 'image') === 'image').length : 0,
    pauseReason: typeof lastPause?.reason === 'string' ? lastPause.reason : undefined,
    pauseCount: pauseLog.length || undefined,
    elapsedMinutes,
    price,
    urgent: !!sr.urgent,
  }
}

/**
 * Génère (ou ré-émet depuis le cache) la fiche coach pour le statut courant
 * de la mission. Ne lève jamais d'erreur : pensé pour un `void …` fire-and-forget.
 */
export async function generateMissionCoachStep(sr: any): Promise<void> {
  try {
    if (!sr || !sr.assignedProviderId) return
    const status = String(sr.status || '')
    if (!COACHED_STATUSES.includes(status)) return

    const ai = await getAiConfig()
    if (!ai.enabled || !ai.features.mission_coach?.enabled) return

    const cached = readCache(sr, status)
    if (cached) {
      // Ré-émettre le conseil mis en cache (ex. reprise de pause → in_progress)
      emitCoach(sr, status, cached)
      return
    }

    const mission = await buildMissionContext(sr)
    const result = await aiAssist({
      type: 'mission_coach',
      category: sr.category,
      description: typeof sr.description === 'string' ? sr.description.slice(0, 1000) : undefined,
      missionStatus: status,
      mission,
    })
    if (!result.advice) return

    const entry: CachedCoach = { advice: result.advice, generatedAt: new Date().toISOString(), model: result.model }

    // Persistance du cache (clé = statut) — sans écraser un éventuel write concurrent
    await ServiceRequest.updateOne(
      { _id: sr._id, [`aiCoach.${status}`]: { $exists: false } },
      { $set: { [`aiCoach.${status}`]: entry } },
    )

    emitCoach(sr, status, entry)
  } catch (err) {
    console.warn('[AI mission-coach] generation failed:', err instanceof Error ? err.message : err)
  }
}
