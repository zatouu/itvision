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

export class AiConfigMissingError extends Error {
  constructor() {
    super('QWEN_CLOUD_API_KEY not configured')
    this.name = 'AiConfigMissingError'
  }
}

export class AiServiceUnavailableError extends Error {
  constructor() {
    super('AI service unavailable')
    this.name = 'AiServiceUnavailableError'
  }
}

export class AiVisionServiceUnavailableError extends Error {
  constructor() {
    super('AI vision service unavailable')
    this.name = 'AiVisionServiceUnavailableError'
  }
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
  if (!QWEN_CLOUD_KEY) throw new AiConfigMissingError()
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
  let configError: AiConfigMissingError | undefined

  // Try QwenCloud first
  try {
    return await callQwenCloud(messages, maxTokens)
  } catch (cloudErr) {
    if (cloudErr instanceof AiConfigMissingError) {
      configError = cloudErr
    }
    console.warn('[Qwen] Cloud failed, trying Ollama:', (cloudErr as Error).message)
  }

  // Fallback to Ollama local
  try {
    return await callOllama(messages, maxTokens)
  } catch (ollamaErr) {
    console.warn('[Qwen] Ollama also failed:', (ollamaErr as Error).message)
    throw configError || new AiServiceUnavailableError()
  }
}

async function callQwenVision(messages: VisionMessage[]): Promise<QwenResult> {
  if (!QWEN_CLOUD_KEY) throw new AiConfigMissingError()
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

function isValidIPv4(host: string): boolean {
  const rawParts = host.split('.')
  if (rawParts.length !== 4) return false
  return rawParts.every((p) => {
    if (p === '') return false
    if (p.length > 1 && p[0] === '0') return false
    const n = Number(p)
    return Number.isInteger(n) && n >= 0 && n <= 255
  })
}

function isPrivateIPv4(host: string): boolean {
  const rawParts = host.split('.')
  if (rawParts.length !== 4 || rawParts.some((p) => p === '' || (p.length > 1 && p[0] === '0'))) {
    return false
  }
  const parts = rawParts.map(Number)
  if (parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false
  const [a, b, c] = parts
  if (a === 0) return true
  if (a === 10) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192) {
    if (b === 168) return true
    if (b === 0 && c === 0) return true
    if (b === 0 && c === 2) return true
    if (b === 31 && c === 196) return true
    if (b === 52 && c === 193) return true
    if (b === 175 && c === 48) return true
  }
  if (a === 198) {
    if (b === 18) return true
    if (b === 51 && c === 100) return true
    if (b === 97 && c === 38) return true
  }
  if (a === 203 && b === 0 && c === 113) return true
  if (a >= 224) return true
  return false
}

function unbracket(addr: string): string {
  return addr.replace(/^\[|\]$/g, '')
}

function expandIPv6(addr: string): string[] | null {
  let a = unbracket(addr).toLowerCase().split('%')[0]
  if (a === '::') a = '0::0'
  const parts = a.split('::')
  if (parts.length > 2) return null
  const left = parts[0] ? parts[0].split(':') : []
  const right = parts[1] ? parts[1].split(':') : []
  if (parts.length === 2) {
    const missing = 8 - (left.length + right.length)
    if (missing < 0) return null
    const middle = Array(missing).fill('0')
    return [...left, ...middle, ...right].map((p) => p || '0')
  }
  if (left.length !== 8) return null
  return left.map((p) => p || '0')
}

function ipv6ToIPv4(groups: string[]): string | null {
  if (groups.length !== 8) return null
  const ffffIndex = groups.findIndex((g) => g.toLowerCase() === 'ffff')
  if (ffffIndex === -1) return null
  const last = groups[7]
  if (last.includes('.')) return last
  if (ffffIndex === 5 && groups.length - ffffIndex - 1 === 2) {
    const high = parseInt(groups[6], 16)
    const low = parseInt(groups[7], 16)
    if (Number.isNaN(high) || Number.isNaN(low)) return null
    const a = (high >> 8) & 0xff
    const b = high & 0xff
    const c = (low >> 8) & 0xff
    const d = low & 0xff
    return `${a}.${b}.${c}.${d}`
  }
  return null
}

function isPrivateIPv6(groups: string[]): boolean {
  if (groups.length !== 8) return true
  if (groups.every((g) => g === '0')) return true
  if (groups.slice(0, 7).every((g) => g === '0') && groups[7] === '1') return true
  const first = parseInt(groups[0], 16)
  if (Number.isNaN(first)) return true
  if (first >= 0xfc00 && first <= 0xfdff) return true
  if (first >= 0xfe80 && first <= 0xfebf) return true
  if (first >= 0xff00) return true
  const mapped = ipv6ToIPv4(groups)
  if (mapped) {
    if (!isValidIPv4(mapped) || isPrivateIPv4(mapped)) return true
  }
  return false
}

export function isInternalOrPrivateHost(url: string): boolean {
  try {
    const { hostname: raw } = new URL(url)
    const hostname = raw.toLowerCase()
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) return true
    // Reject hex-integer or mixed hex/dotted IP literals (e.g. 0x7f.0.0.1 or 0x7f000001)
    if (/^0x[0-9a-f]+(?:\.[0-9a-fx]+)*$/i.test(hostname)) return true
    if (/^[0-9.]+$/.test(hostname)) {
      if (isValidIPv4(hostname)) return isPrivateIPv4(hostname)
      return true
    }
    if (hostname.includes(':')) {
      const groups = expandIPv6(hostname)
      if (!groups) return true
      return isPrivateIPv6(groups)
    }
    return false
  } catch {
    return true
  }
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
  let configError: AiConfigMissingError | undefined

  try {
    return await callQwenVision(messages)
  } catch (cloudErr) {
    if (cloudErr instanceof AiConfigMissingError) {
      configError = cloudErr
    }
    console.warn('[Qwen Vision] Cloud failed, trying Ollama:', (cloudErr as Error).message)
  }

  try {
    return await callOllamaVision(messages)
  } catch (ollamaErr) {
    console.warn('[Qwen Vision] Ollama also failed:', (ollamaErr as Error).message)
    throw configError || new AiVisionServiceUnavailableError()
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
