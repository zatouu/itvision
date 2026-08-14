/**
 * Qwen AI client — hybrid: QwenCloud API (primary) + Ollama local (fallback)
 * OpenAI-compatible endpoint: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
 */

const QWEN_CLOUD_BASE = process.env.QWEN_CLOUD_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
const QWEN_CLOUD_KEY = process.env.QWEN_CLOUD_API_KEY || process.env.DASHSCOPE_API_KEY || ''
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen3-8b'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b'

const TIMEOUT_MS = 15_000

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface QwenResult {
  text: string
  source: 'qwencloud' | 'ollama'
  model: string
}

async function callWithTimeout(url: string, body: any, timeoutMs: number): Promise<any> {
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

async function callQwenCloud(messages: ChatMessage[]): Promise<QwenResult> {
  if (!QWEN_CLOUD_KEY) throw new Error('QWEN_CLOUD_API_KEY not configured')
  const payload = {
    model: QWEN_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 800,
    enable_thinking: false,
  }
  const data = await callWithTimeout(
    `${QWEN_CLOUD_BASE}/chat/completions`,
    { _payload: payload, _authHeader: { Authorization: `Bearer ${QWEN_CLOUD_KEY}` } },
    TIMEOUT_MS,
  )
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('Empty response from QwenCloud')
  return { text, source: 'qwencloud', model: QWEN_MODEL }
}

async function callOllama(messages: ChatMessage[]): Promise<QwenResult> {
  const payload = {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: { temperature: 0.7, num_predict: 800 },
  }
  const data = await callWithTimeout(
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
export async function qwenChat(messages: ChatMessage[]): Promise<QwenResult> {
  // Try QwenCloud first
  try {
    return await callQwenCloud(messages)
  } catch (cloudErr) {
    console.warn('[Qwen] Cloud failed, trying Ollama:', (cloudErr as Error).message)
  }

  // Fallback to Ollama local
  try {
    return await callOllama(messages)
  } catch (ollamaErr) {
    console.warn('[Qwen] Ollama also failed:', (ollamaErr as Error).message)
    throw new Error('AI service unavailable')
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
