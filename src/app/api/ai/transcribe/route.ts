import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { checkAiEntitlement, refundAiCall } from '@/lib/ai/entitlement'
import { applyRateLimit, aiRateLimiter } from '@/lib/rate-limiter'
import { runMultipartRoute } from '@/lib/middleware/multipart-routes'

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
// Hors middleware (corps non cloné) : voir src/lib/middleware/multipart-routes.ts
export async function POST(request: NextRequest) {
  return runMultipartRoute(request, () => handleTranscribe(request))
}

async function handleTranscribe(request: NextRequest): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(request, aiRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Non authentifié' }, { status: 401 })
  }

  if (sttProviders().length === 0) {
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
    const text = await transcribeWithProviders(audio, language)
    return NextResponse.json({ text, usage: { cost: entitlement.cost, quotaRemaining: entitlement.quotaRemaining, balance: entitlement.balance } })
  } catch (err) {
    await refundAiCall(userId, entitlement, 'enhance_request')
    const reason = err instanceof SttError ? err.reason : 'error'
    console.error('[POST /api/ai/transcribe]', err instanceof Error ? err.message : err)
    if (reason === 'quota' || reason === 'rate_limit') {
      return NextResponse.json(
        { error: 'Dictée vocale momentanément indisponible : écrivez votre demande, ou réessayez dans quelques minutes', code: 'stt_unavailable' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Transcription impossible, réessayez ou écrivez votre demande' }, { status: 502 })
  }
}

type SttReason = 'quota' | 'rate_limit' | 'auth' | 'error'

class SttError extends Error {
  constructor(message: string, readonly reason: SttReason) { super(message) }
}

interface SttProvider { label: string; base: string; key: string; model: string }

/** Fournisseurs compatibles OpenAI `/audio/transcriptions` : principal puis secours (ex. Groq whisper-large-v3). */
function sttProviders(): SttProvider[] {
  const list: SttProvider[] = []
  const primaryKey = process.env.STT_API_KEY || process.env.OPENAI_API_KEY
  if (primaryKey) {
    list.push({
      label: 'principal',
      base: (process.env.STT_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
      key: primaryKey,
      model: process.env.STT_MODEL || 'whisper-1',
    })
  }
  if (process.env.STT_FALLBACK_API_KEY && process.env.STT_FALLBACK_API_URL) {
    list.push({
      label: 'secours',
      base: process.env.STT_FALLBACK_API_URL.replace(/\/+$/, ''),
      key: process.env.STT_FALLBACK_API_KEY,
      model: process.env.STT_FALLBACK_MODEL || 'whisper-large-v3',
    })
  }
  return list
}

async function callProvider(p: SttProvider, audio: File, language?: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const upstream = new FormData()
    upstream.append('file', audio, audio.name || 'dictee.m4a')
    upstream.append('model', p.model)
    upstream.append('response_format', 'json')
    upstream.append('prompt', STT_PROMPT)
    if (language) upstream.append('language', language)

    const res = await fetch(`${p.base}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p.key}` },
      body: upstream,
      signal: AbortSignal.timeout(45_000),
    })
    if (res.ok) {
      const data = await res.json().catch(() => null)
      const text = typeof data?.text === 'string' ? data.text.trim().slice(0, 2000) : ''
      if (!text) throw new SttError(`STT ${p.label} : transcription vide`, 'error')
      return text
    }
    const body = await res.json().catch(() => null) as { error?: { code?: string; type?: string; message?: string } } | null
    const code = body?.error?.code || body?.error?.type || ''
    if (res.status === 429 && /quota|billing/i.test(code + (body?.error?.message || ''))) {
      // Compte sans crédit : inutile de réessayer ce fournisseur
      throw new SttError(`STT ${p.label} 429 quota épuisé (${code}) — recharger le compte ou configurer STT_FALLBACK_*`, 'quota')
    }
    if (res.status === 429 && attempt === 0) {
      const wait = Math.min(3, Number(res.headers.get('retry-after')) || 1)
      await new Promise(r => setTimeout(r, wait * 1000))
      continue
    }
    const reason: SttReason = res.status === 429 ? 'rate_limit' : res.status === 401 || res.status === 403 ? 'auth' : 'error'
    throw new SttError(`STT ${p.label} ${res.status}${code ? ` (${code})` : ''}`, reason)
  }
  throw new SttError(`STT ${p.label} 429 limite de débit`, 'rate_limit')
}

async function transcribeWithProviders(audio: File, language?: string): Promise<string> {
  let last: SttError | undefined
  for (const provider of sttProviders()) {
    try {
      return await callProvider(provider, audio, language)
    } catch (err) {
      last = err instanceof SttError ? err : new SttError(err instanceof Error ? err.message : String(err), 'error')
      console.warn('[transcribe]', last.message)
    }
  }
  throw last || new SttError('Aucun fournisseur de transcription', 'error')
}
