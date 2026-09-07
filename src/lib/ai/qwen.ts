/**
 * Qwen AI client — hybrid: QwenCloud API (primary) + Ollama local (fallback)
 * OpenAI-compatible endpoint: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
 */

const QWEN_CLOUD_BASE = process.env.QWEN_CLOUD_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
const QWEN_CLOUD_KEY = process.env.QWEN_CLOUD_API_KEY || process.env.DASHSCOPE_API_KEY || ''
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-turbo'
const QWEN_VL_MODEL = process.env.QWEN_VL_MODEL || 'qwen-vl-max'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b'
const OLLAMA_VL_MODEL = process.env.OLLAMA_VL_MODEL || 'llava:13b'

const TIMEOUT_MS = 15_000
const VISION_TIMEOUT_MS = 35_000

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type VisionContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface VisionMessage {
  role: 'user'
  content: VisionContentPart[]
}

export interface QwenResult {
  text: string
  source: 'qwencloud' | 'ollama'
  model: string
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>
  message?: { content?: string }
}

async function callWithTimeout<T = ChatCompletionResponse>(url: string, body: { _payload: Record<string, unknown>; _authHeader?: Record<string, string> }, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(body._authHeader || {}) },
      body: JSON.stringify(body._payload),
      signal: controller.signal,
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`)
    }
    return await res.json()
  } finally {
    clearTimeout(id)
  }
}

async function callQwenCloud(messages: ChatMessage[], maxTokens = 800): Promise<QwenResult> {
  if (!QWEN_CLOUD_KEY) throw new Error('QWEN_CLOUD_API_KEY not configured')
  const payload = {
    model: QWEN_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens,
    enable_thinking: false,
  }
  const data = await callWithTimeout<ChatCompletionResponse>(
    `${QWEN_CLOUD_BASE}/chat/completions`,
    { _payload: payload, _authHeader: { Authorization: `Bearer ${QWEN_CLOUD_KEY}` } },
    TIMEOUT_MS,
  )
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('Empty response from QwenCloud')
  return { text, source: 'qwencloud', model: QWEN_MODEL }
}

async function callOllama(messages: ChatMessage[], maxTokens = 800): Promise<QwenResult> {
  const payload = {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: { temperature: 0.7, num_predict: maxTokens },
  }
  const data = await callWithTimeout<ChatCompletionResponse>(
    `${OLLAMA_BASE}/api/chat`,
    { _payload: payload },
    TIMEOUT_MS,
  )
  const text = data?.message?.content || ''
  if (!text) throw new Error('Empty response from Ollama')
  return { text, source: 'ollama', model: OLLAMA_MODEL }
}

/**
 * Call Qwen with fallback: QwenCloud → Ollama → throw
 */
export async function qwenChat(messages: ChatMessage[], maxTokens?: number): Promise<QwenResult> {
  // Try QwenCloud first
  try {
    return await callQwenCloud(messages, maxTokens)
  } catch (cloudErr) {
    console.warn('[Qwen] Cloud failed, trying Ollama:', (cloudErr as Error).message)
  }

  // Fallback to Ollama local
  try {
    return await callOllama(messages, maxTokens)
  } catch (ollamaErr) {
    console.warn('[Qwen] Ollama also failed:', (ollamaErr as Error).message)
    throw new Error('AI service unavailable')
  }
}

async function callQwenVision(messages: VisionMessage[]): Promise<QwenResult> {
  if (!QWEN_CLOUD_KEY) throw new Error('QWEN_CLOUD_API_KEY not configured')
  const payload = {
    model: QWEN_VL_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 1200,
  }
  const data = await callWithTimeout<ChatCompletionResponse>(
    `${QWEN_CLOUD_BASE}/chat/completions`,
    { _payload: payload, _authHeader: { Authorization: `Bearer ${QWEN_CLOUD_KEY}` } },
    VISION_TIMEOUT_MS,
  )
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('Empty response from QwenCloud vision')
  return { text, source: 'qwencloud', model: QWEN_VL_MODEL }
}

async function callOllamaVision(messages: VisionMessage[]): Promise<QwenResult> {
  const payload = {
    model: OLLAMA_VL_MODEL,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content.map(c => {
        if (c.type === 'text') return c.text
        if (c.type === 'image_url') {
          const url = c.image_url.url
          if (url.startsWith('data:')) return url
          // Ollama ne supporte pas les URLs distantes en natif, il faut base64
          throw new Error('Ollama vision requires base64 images')
        }
        return ''
      }).join('\n'),
      images: m.content
        .filter((c): c is { type: 'image_url'; image_url: { url: string } } => c.type === 'image_url')
        .map(c => c.image_url.url)
        .filter(url => url.startsWith('data:')),
    })),
    stream: false,
    options: { temperature: 0.3, num_predict: 1200 },
  }
  const data = await callWithTimeout<ChatCompletionResponse>(
    `${OLLAMA_BASE}/api/chat`,
    { _payload: payload },
    VISION_TIMEOUT_MS,
  )
  const text = data?.message?.content || ''
  if (!text) throw new Error('Empty response from Ollama vision')
  return { text, source: 'ollama', model: OLLAMA_VL_MODEL }
}

const MAX_DATA_URI_LENGTH = 5 * 1024 * 1024 // 5 MB

function isInternalOrPrivateHost(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    const lower = hostname.toLowerCase()
    if (lower === 'localhost') return true
    if (lower.endsWith('.localhost')) return true
    if (lower.endsWith('.local')) return true
    if (/^127\./.test(lower)) return true
    if (/^10\./.test(lower)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true
    if (/^192\.168\./.test(lower)) return true
    if (lower.startsWith('[') && (lower.includes('::1') || lower === '[::1]')) return true
  } catch { /* ignore */ }
  return false
}

function normalizeImageUrl(url: string): string {
  const u = url.trim()
  if (!u) return ''
  if (u.startsWith('data:')) {
    if (u.length > MAX_DATA_URI_LENGTH) return ''
    return u
  }
  if (u.startsWith('//')) {
    const withScheme = `https:${u}`
    if (isInternalOrPrivateHost(withScheme)) return ''
    return withScheme
  }
  if (!/^https?:\/\//i.test(u)) return ''
  if (isInternalOrPrivateHost(u)) return ''
  return u
}

/**
 * Vision Qwen: analyse une ou plusieurs images avec un prompt.
 * Les images peuvent être des URLs publiques ou des data URIs base64.
 */
export async function qwenVision(prompt: string, images: string[]): Promise<QwenResult> {
  if (!images || images.length === 0) throw new Error('At least one image is required for vision')

  const content: VisionContentPart[] = [{ type: 'text', text: prompt }]
  for (const raw of images) {
    const url = normalizeImageUrl(raw)
    if (!url) continue
    content.push({ type: 'image_url', image_url: { url } })
  }

  if (content.length === 1) throw new Error('No valid image URLs provided')

  const messages: VisionMessage[] = [{ role: 'user', content }]

  try {
    return await callQwenVision(messages)
  } catch (cloudErr) {
    console.warn('[Qwen Vision] Cloud failed, trying Ollama:', (cloudErr as Error).message)
  }

  try {
    return await callOllamaVision(messages)
  } catch (ollamaErr) {
    console.warn('[Qwen Vision] Ollama also failed:', (ollamaErr as Error).message)
    throw new Error('AI vision service unavailable')
  }
}

/**
 * Check if AI is available (either cloud or local)
 */
export async function checkAiAvailability(): Promise<{ available: boolean; provider: string }> {
  if (QWEN_CLOUD_KEY) return { available: true, provider: 'qwencloud' }
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) return { available: true, provider: 'ollama' }
  } catch { /* ignore */ }
  return { available: false, provider: 'none' }
}

/**
 * Check if vision AI is available
 */
export async function checkVisionAvailability(): Promise<{ available: boolean; provider: string }> {
  if (QWEN_CLOUD_KEY) return { available: true, provider: 'qwencloud' }
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) return { available: true, provider: 'ollama' }
  } catch { /* ignore */ }
  return { available: false, provider: 'none' }
}
