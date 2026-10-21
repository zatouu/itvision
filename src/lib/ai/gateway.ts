/**
 * Gateway LLM — un seul endroit pour choisir les fournisseurs.
 *
 * Ordre de préférence texte (le moins cher / le plus rapide d'abord) :
 *   1. DeepSeek (OpenAI-compatible) — jugement et rédaction à bas coût
 *   2. QwenCloud (dashscope, compatible OpenAI) — vision + secours texte
 *   3. Ollama local — dernier recours, hors ligne
 *
 * Vision : Qwen-VL puis Ollama (llava) — DeepSeek n'expose pas de modèle image.
 *
 * Variables d'environnement :
 *   DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL (défaut https://api.deepseek.com/v1)
 *   DEEPSEEK_MODEL   (défaut 'deepseek-chat' — à ajuster selon l'offre en vigueur)
 *   LLM_TEXT_PROVIDER (force 'deepseek' | 'qwencloud' | 'ollama')
 *   LLM_VISION_PROVIDER (force 'qwencloud' | 'ollama')
 *   QWEN_CLOUD_API_KEY | DASHSCOPE_API_KEY, QWEN_CLOUD_BASE_URL, QWEN_MODEL, QWEN_VL_MODEL
 *   OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_VL_MODEL
 *
 * Aucune clé → les appelants retombent en mode dégradé (déjà géré en amont).
 */

export type LlmProviderId = 'deepseek' | 'qwencloud' | 'ollama'

export interface TextProvider {
  id: LlmProviderId
  label: string
  baseUrl: string
  apiKey?: string
  model: string
  /** Corps additionnel spécifique au fournisseur. */
  extraBody?: Record<string, unknown>
}

export const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
export const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

export const QWEN_CLOUD_BASE = process.env.QWEN_CLOUD_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
export const QWEN_CLOUD_KEY = process.env.QWEN_CLOUD_API_KEY || process.env.DASHSCOPE_API_KEY || ''
export const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-turbo'
export const QWEN_VL_MODEL = process.env.QWEN_VL_MODEL || 'qwen-vl-max'

export const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b'
export const OLLAMA_VL_MODEL = process.env.OLLAMA_VL_MODEL || 'llava:13b'

/** Fournisseurs texte configurés, dans l'ordre de préférence. */
export function textProviders(): TextProvider[] {
  const forced = (process.env.LLM_TEXT_PROVIDER || '').trim().toLowerCase()
  const all: TextProvider[] = []

  if (DEEPSEEK_KEY) {
    all.push({ id: 'deepseek', label: 'DeepSeek', baseUrl: DEEPSEEK_BASE, apiKey: DEEPSEEK_KEY, model: DEEPSEEK_MODEL })
  }
  if (QWEN_CLOUD_KEY) {
    all.push({
      id: 'qwencloud',
      label: 'Qwen',
      baseUrl: QWEN_CLOUD_BASE,
      apiKey: QWEN_CLOUD_KEY,
      model: QWEN_MODEL,
      extraBody: { enable_thinking: false },
    })
  }
  // Ollama est toujours tentable (local, sans clé)
  all.push({ id: 'ollama', label: 'Ollama', baseUrl: OLLAMA_BASE, model: OLLAMA_MODEL })

  if (forced) {
    const preferred = all.filter(p => p.id === forced)
    if (preferred.length > 0) return preferred
  }
  return all
}

/** Fournisseurs vision, dans l'ordre de préférence. */
export function visionProviders(): TextProvider[] {
  const forced = (process.env.LLM_VISION_PROVIDER || '').trim().toLowerCase()
  const all: TextProvider[] = []

  if (QWEN_CLOUD_KEY) {
    all.push({ id: 'qwencloud', label: 'Qwen-VL', baseUrl: QWEN_CLOUD_BASE, apiKey: QWEN_CLOUD_KEY, model: QWEN_VL_MODEL })
  }
  all.push({ id: 'ollama', label: 'Ollama (vision)', baseUrl: OLLAMA_BASE, model: OLLAMA_VL_MODEL })

  if (forced) {
    const preferred = all.filter(p => p.id === forced)
    if (preferred.length > 0) return preferred
  }
  return all
}

export interface GatewayResult {
  text: string
  source: LlmProviderId
  model: string
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  message?: { content?: string }
}

async function fetchWithTimeout<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(id)
  }
}

/** Appel texte OpenAI-compatible (DeepSeek, QwenCloud) ou Ollama natif. */
export async function callTextProvider(
  provider: TextProvider,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens = 800,
  timeoutMs = 15_000,
): Promise<GatewayResult> {
  if (provider.id === 'ollama') {
    const data = await fetchWithTimeout<ChatCompletionResponse>(
      `${provider.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.model,
          messages,
          stream: false,
          options: { temperature: 0.7, num_predict: maxTokens },
        }),
      },
      timeoutMs,
    )
    const text = data?.message?.content || ''
    if (!text) throw new Error('Empty response from Ollama')
    return { text, source: 'ollama', model: provider.model }
  }

  const data = await fetchWithTimeout<ChatCompletionResponse>(
    `${provider.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        ...(provider.extraBody || {}),
      }),
    },
    timeoutMs,
  )
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error(`Empty response from ${provider.label}`)
  return { text, source: provider.id, model: provider.model }
}

/** Appel vision (format OpenAI multi-part) — Qwen-VL ou Ollama. */
export async function callVisionProvider(
  provider: TextProvider,
  messages: Array<{ role: string; content: Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
  maxTokens = 1200,
  timeoutMs = 35_000,
): Promise<GatewayResult> {
  if (provider.id === 'ollama') {
    const data = await fetchWithTimeout<ChatCompletionResponse>(
      `${provider.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
              .map(c => (c.type === 'text' ? c.text : c.type === 'image_url' ? c.image_url?.url : '') || '')
              .join('\n'),
            images: m.content
              .filter(c => c.type === 'image_url' && c.image_url?.url?.startsWith('data:'))
              .map(c => c.image_url!.url),
          })),
          stream: false,
          options: { temperature: 0.3, num_predict: maxTokens },
        }),
      },
      timeoutMs,
    )
    const text = data?.message?.content || ''
    if (!text) throw new Error('Empty response from Ollama vision')
    return { text, source: 'ollama', model: provider.model }
  }

  const data = await fetchWithTimeout<ChatCompletionResponse>(
    `${provider.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({ model: provider.model, messages, temperature: 0.3, max_tokens: maxTokens }),
    },
    timeoutMs,
  )
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error(`Empty response from ${provider.label} vision`)
  return { text, source: provider.id, model: provider.model }
}

/**
 * Configuration du modèle LangChain des agents (OpenAI-compatible).
 * Retourne le premier fournisseur texte OpenAI-compatible configuré.
 */
export function agentModelConfig(): { baseUrl: string; apiKey: string; model: string; label: string } | null {
  const provider = textProviders().find(p => p.id !== 'ollama' && p.apiKey)
  if (!provider) return null
  return { baseUrl: provider.baseUrl, apiKey: provider.apiKey!, model: provider.model, label: provider.label }
}

/** Ollama répond-il ? (sondage court, non bloquant) */
export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}
