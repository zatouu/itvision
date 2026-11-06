/**
 * Fabrique de modèle LLM pour les agents (LangGraph).
 *
 * Priorité :
 *   1. Gateway OpenAI-compatible (DeepSeek en premier, puis QwenCloud) —
 *      cf. src/lib/ai/gateway.ts. Un seul endroit à configurer.
 *   2. Anthropic (Claude Haiku) si ANTHROPIC_API_KEY est posée.
 *   3. OpenAI si OPENAI_API_KEY est posée.
 * Retourne null si rien n'est configuré → mode dégradé (checks déterministes seuls).
 *
 * `AGENT_LLM_MODEL` force le modèle du fournisseur retenu.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOpenAI } from '@langchain/openai'
import { agentModelConfig } from '@/lib/ai/gateway'

let cached: BaseChatModel | null | undefined

export function getAgentModel(): BaseChatModel | null {
  if (cached !== undefined) return cached

  try {
    const gw = agentModelConfig()
    if (gw) {
      cached = new ChatOpenAI({
        model: process.env.AGENT_LLM_MODEL || gw.model,
        temperature: 0,
        maxTokens: 1024,
        apiKey: gw.apiKey,
        configuration: { baseURL: gw.baseUrl },
      })
      return cached
    }

    if (process.env.ANTHROPIC_API_KEY) {
      cached = new ChatAnthropic({
        model: process.env.AGENT_LLM_MODEL || 'claude-3-5-haiku-latest',
        temperature: 0,
        maxTokens: 1024,
      })
      return cached
    }
    if (process.env.OPENAI_API_KEY) {
      cached = new ChatOpenAI({
        model: process.env.AGENT_LLM_MODEL || 'gpt-4o-mini',
        temperature: 0,
        maxTokens: 1024,
      })
      return cached
    }
  } catch (e) {
    console.warn('[agents] LLM indisponible — mode checks uniquement:', (e as Error).message)
  }
  cached = null
  return null
}
