import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { checkAiEntitlement, refundAiCall } from '@/lib/ai/entitlement'
import { applyRateLimit, aiRateLimiter } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_AUDIO_BYTES = 10 * 1024 * 1024
const STT_PROMPT = 'Demande de service à domicile au Sénégal : plomberie, électricité, menuiserie, climatisation, maçonnerie, peinture.'

/**
 * POST /api/ai/transcribe — dictée vocale d'une demande Xeuy (multipart : `audio`, `language` optionnel).
 * Service compatible OpenAI `/audio/transcriptions` : STT_API_URL (défaut OpenAI), STT_API_KEY
 * (ou OPENAI_API_KEY), STT_MODEL (défaut whisper-1). Facturé comme la reformulation de demande.
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request, aiRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Non authentifié' }, { status: 401 })
  }

  const apiKey = process.env.STT_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Dictée vocale non configurée', code: 'stt_disabled' }, { status: 503 })
  }

  const form = await request.formData().catch(() => null)
  const audio = form?.get('audio')
  if (!audio || typeof audio === 'string') {
    return NextResponse.json({ error: 'Fichier audio manquant' }, { status: 400 })
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio vide ou trop volumineux (10 Mo max)' }, { status: 400 })
  }
  if (audio.type && !audio.type.startsWith('audio/') && audio.type !== 'video/mp4') {
    return NextResponse.json({ error: 'Format audio non supporté' }, { status: 400 })
  }
  // Wolof non pris en charge explicitement par Whisper : détection automatique hors français
  const language = form?.get('language') === 'fr' ? 'fr' : undefined

  const userId = auth.user.id
  const entitlement = await checkAiEntitlement(userId, auth.user.role, 'enhance_request')
  if (!entitlement.allowed) {
    const status = entitlement.reason === 'ai_disabled' ? 403 : 402
    return NextResponse.json({ error: 'Dictée vocale indisponible', code: entitlement.reason, cost: entitlement.cost, balance: entitlement.balance }, { status })
  }

  try {
    const upstream = new FormData()
    upstream.append('file', audio, audio.name || 'dictee.m4a')
    upstream.append('model', process.env.STT_MODEL || 'whisper-1')
    upstream.append('response_format', 'json')
    upstream.append('prompt', STT_PROMPT)
    if (language) upstream.append('language', language)

    const base = (process.env.STT_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
    const res = await fetch(`${base}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
      signal: AbortSignal.timeout(45_000),
    })
    if (!res.ok) throw new Error(`STT ${res.status}`)
    const data = await res.json().catch(() => null)
    const text = typeof data?.text === 'string' ? data.text.trim().slice(0, 2000) : ''
    if (!text) throw new Error('Transcription vide')

    return NextResponse.json({ text, usage: { cost: entitlement.cost, quotaRemaining: entitlement.quotaRemaining, balance: entitlement.balance } })
  } catch (err) {
    await refundAiCall(userId, entitlement, 'enhance_request')
    console.error('[POST /api/ai/transcribe]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Transcription impossible, réessayez ou écrivez votre demande' }, { status: 502 })
  }
}
