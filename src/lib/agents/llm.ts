/**
 * Fabrique de modèle LLM pour les agents.
 * Priorité Anthropic (Claude Haiku — rapide, bon français, ~0,001€/analyse),
 * fallback OpenAI. Retourne null si aucune clé → mode dégradé (checks only).
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOpenAI } from '@langchain/openai'

let cached: BaseChatModel | null | undefined

export function getAgentModel(): BaseChatModel | null {
  if (cached !== undefined) return cached

  try {
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
