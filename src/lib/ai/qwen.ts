/**
 * Client IA du dépôt — délègue au gateway LLM (src/lib/ai/gateway.ts).
 *
 * L'API publique ne change pas (qwenChat / qwenVision / checkAiAvailability…)
 * mais l'ordre des fournisseurs est désormais centralisé :
 *   texte  : DeepSeek → QwenCloud → Ollama local
 *   vision : Qwen-VL → Ollama (llava)
 * Voir gateway.ts pour les variables d'environnement (DEEPSEEK_API_KEY…).
 */

import {
  textProviders,
  visionProviders,
  callTextProvider,
  callVisionProvider,
  checkOllamaAvailable,
  OLLAMA_BASE,
  OLLAMA_MODEL,
  OLLAMA_VL_MODEL,
  QWEN_CLOUD_BASE,
  QWEN_CLOUD_KEY,
  QWEN_MODEL,
  QWEN_VL_MODEL,
  DEEPSEEK_BASE,
  DEEPSEEK_KEY,
  DEEPSEEK_MODEL,
  type LlmProviderId,
} from './gateway'

// Ré-exports pour compatibilité (d'autres modules peuvent s'y référer)
export {
  OLLAMA_BASE, OLLAMA_MODEL, OLLAMA_VL_MODEL,
  QWEN_CLOUD_BASE, QWEN_CLOUD_KEY, QWEN_MODEL, QWEN_VL_MODEL,
  DEEPSEEK_BASE, DEEPSEEK_KEY, DEEPSEEK_MODEL,
}

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
  source: LlmProviderId
  model: string
}

export class AiConfigMissingError extends Error {
  constructor() {
    super('Aucun fournisseur LLM configuré (DEEPSEEK_API_KEY / QWEN_CLOUD_API_KEY / Ollama)')
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

/**
 * Appel texte : premier fournisseur configuré qui répond.
 * DeepSeek → QwenCloud → Ollama.
 */
export async function qwenChat(messages: ChatMessage[], maxTokens?: number): Promise<QwenResult> {
  const providers = textProviders()
  let lastError: Error | undefined

  for (const provider of providers) {
    try {
      return await callTextProvider(provider, messages, maxTokens, TIMEOUT_MS)
    } catch (err) {
      lastError = err as Error
      console.warn(`[LLM] ${provider.label} indisponible:`, lastError.message)
    }
  }

  throw lastError ? new AiServiceUnavailableError() : new AiConfigMissingError()
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
 * Vision: analyse une ou plusieurs images avec un prompt.
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
  const providers = visionProviders()
  let lastError: Error | undefined

  for (const provider of providers) {
    try {
      return await callVisionProvider(provider, messages, 1200, VISION_TIMEOUT_MS)
    } catch (err) {
      lastError = err as Error
      console.warn(`[LLM] vision ${provider.label} indisponible:`, lastError.message)
    }
  }

  throw lastError ? new AiVisionServiceUnavailableError() : new AiConfigMissingError()
}

/**
 * Check if AI is available (either cloud or local)
 */
export async function checkAiAvailability(): Promise<{ available: boolean; provider: string }> {
  const provider = textProviders().find(p => p.id !== 'ollama')
  if (provider) return { available: true, provider: provider.id }
  if (await checkOllamaAvailable()) return { available: true, provider: 'ollama' }
  return { available: false, provider: 'none' }
}

/**
 * Check if vision AI is available
 */
export async function checkVisionAvailability(): Promise<{ available: boolean; provider: string }> {
  const provider = visionProviders().find(p => p.id !== 'ollama')
  if (provider) return { available: true, provider: provider.id }
  if (await checkOllamaAvailable()) return { available: true, provider: 'ollama' }
  return { available: false, provider: 'none' }
}
