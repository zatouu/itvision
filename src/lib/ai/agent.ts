import { qwenChat, type ChatMessage } from './qwen'

export interface ToolParameter {
  type: string
  description: string
  enum?: string[]
}

export interface AgentToolDefinition {
  name: string
  description: string
  parameters: Record<string, ToolParameter>
  readOnly: boolean
}

export interface AgentStep {
  thought?: string
  tool?: string
  toolInput?: Record<string, unknown>
  observation?: unknown
}

export interface AgentPendingAction {
  tool: string
  args: Record<string, unknown>
  reasoning: string
}

export interface AgentRunResult {
  finalAnswer: string
  trace: AgentStep[]
  actions: AgentPendingAction[]
  pendingAction?: AgentPendingAction
  source: string
  model: string
  raw: string
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export type ToolHandler = (
  args: Record<string, unknown>,
  confirmed: boolean,
  caller: { userId: string; role: string }
) => Promise<unknown>

const MAX_ITERATIONS = 4
const AGENT_MAX_TOKENS = 1200

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```(?:json)?/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object found in AI response')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function buildSystemPrompt(tools: AgentToolDefinition[], confirmed: boolean): string {
  const toolList = tools
    .map((t) => {
      const params = Object.entries(t.parameters)
        .map(([k, v]) => `- ${k}: ${v.type} — ${v.description}${v.enum ? ` (valeurs: ${v.enum.join(', ')})` : ''}`)
        .join('\n')
      return `### ${t.name}\n${t.description}\nParamètres:\n${params || '- aucun'}\nNécessite confirmation: ${t.readOnly ? 'non' : 'oui'}`
    })
    .join('\n\n')

  return `Tu es un agent autonome administrateur pour la plateforme IT Vision. Tu aides le staff à gérer les commandes et les besoins administratifs.

RÈGLES ABSOLUES:
1. Tu réfléchis étape par étape.
2. Tu as accès aux outils ci-dessous. Pour les tâches de lecture (readOnly = true), exécute-les directement.
3. Pour les tâches d'écriture (readOnly = false), tu ne DOIS exécuter l'action que si confirmed = true. Sinon, tu retournes un plan précis dans "pendingAction" et une explication dans "finalAnswer".
4. Tu ne devines JAMAIS des IDs. Si une information manque, utilise searchUsers ou getOrders pour la trouver.
5. Tu réponds en français clair, concis et professionnel.
6. Chaque étape doit produire un objet JSON strict sans markdown.

FORMAT DE RÉPONSE POUR CHAQUE ÉTAPE:
{
  "thought": "ta réflexion courte",
  "tool": "nom de l'outil ou null",
  "toolInput": { ... },
  "finalAnswer": "réponse finale si tu as terminé, sinon null"
}

Si finalAnswer est non null, tu arrêtes immédiatement et ne choisis pas d'autre outil.

Si tu as un pendingAction pour une opération d'écriture, l'utilisateur doit confirmer. Dans ce cas finalAnswer doit expliquer ce que tu vas faire et demander confirmation. Le pendingAction contient:
{
  "tool": "nom",
  "args": { ... },
  "reasoning": "pourquoi cette action"
}

État de confirmation actuel: ${confirmed ? 'confirmé — tu peux exécuter les actions d\'écriture' : 'non confirmé — demande une confirmation explicite avant d\'écrire'}.

OUTILS DISPONIBLES:

${toolList}`
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export async function runAdminAgent(
  userMessage: string,
  tools: AgentToolDefinition[],
  toolHandlers: Record<string, ToolHandler>,
  caller: { userId: string; role: string },
  options: { confirmed?: boolean } = {}
): Promise<AgentRunResult> {
  const confirmed = options.confirmed === true
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(tools, confirmed) },
    { role: 'user', content: userMessage },
  ]

  const trace: AgentStep[] = []
  let modelSource = 'qwencloud'
  let modelName = ''
  let lastRaw = ''

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const result = await qwenChat(messages, AGENT_MAX_TOKENS)
    modelSource = result.source
    modelName = result.model
    lastRaw = result.text

    let rawParsed: unknown
    try {
      rawParsed = extractJson(result.text)
    } catch (err) {
      console.warn('[AdminAgent] Failed to parse JSON:', err, result.text)
      messages.push({ role: 'assistant', content: result.text })
      messages.push({
        role: 'user',
        content: 'Tu dois répondre UNIQUEMENT avec un objet JSON valide respectant le format demandé.',
      })
      continue
    }
    const parsed = isPlainRecord(rawParsed) ? rawParsed : {}

    const toolInput = isPlainRecord(parsed.toolInput) ? parsed.toolInput : undefined
    const step: AgentStep = {
      thought: getString(parsed.thought),
      tool: getString(parsed.tool),
      toolInput,
    }

    const finalAnswer = getString(parsed.finalAnswer)
    if (finalAnswer) {
      step.observation = 'final'
      trace.push(step)

      if (!confirmed) {
        const rawPending = parsed.pendingAction
        if (isPlainRecord(rawPending)) {
          const pendingTool = getString(rawPending.tool)
          const pendingReasoning = getString(rawPending.reasoning)
          const pendingArgs = isPlainRecord(rawPending.args) ? rawPending.args : {}
          if (pendingTool) {
            const pendingAction: AgentPendingAction = {
              tool: pendingTool,
              args: pendingArgs,
              reasoning: pendingReasoning || "Action demandée par l'administrateur",
            }
            return {
              finalAnswer,
              trace,
              actions: [],
              pendingAction,
              source: modelSource,
              model: modelName,
              raw: lastRaw,
            }
          }
        }
      }

      return {
        finalAnswer,
        trace,
        actions: [],
        source: modelSource,
        model: modelName,
        raw: lastRaw,
      }
    }

    if (!step.tool) {
      step.observation = 'no tool selected'
      trace.push(step)
      return {
        finalAnswer: "Je n'ai pas pu identifier d'outil à utiliser. Pouvez-vous reformuler ?",
        trace,
        actions: [],
        source: modelSource,
        model: modelName,
        raw: lastRaw,
      }
    }

    const toolDef = tools.find((t) => t.name === step.tool)
    if (!toolDef) {
      step.observation = `unknown tool: ${step.tool}`
      trace.push(step)
      messages.push({ role: 'assistant', content: result.text })
      messages.push({
        role: 'user',
        content: `L'outil "${step.tool}" n'existe pas. Choisis un outil valide parmi : ${tools.map((t) => t.name).join(', ')}.`,
      })
      continue
    }

    const effectiveToolInput = toolInput ?? {}

    // If the tool is a write action and not confirmed, stop and ask for confirmation
    if (!toolDef.readOnly && !confirmed) {
      trace.push({ ...step, observation: 'waiting for confirmation' })
      return {
        finalAnswer: `Je vais effectuer l'action "${toolDef.name}" avec les paramètres suivants : ${JSON.stringify(effectiveToolInput)}. Veuillez confirmer pour exécuter cette action.`,
        trace,
        actions: [],
        pendingAction: { tool: toolDef.name, args: effectiveToolInput, reasoning: step.thought || "Action demandée par l'administrateur" },
        source: modelSource,
        model: modelName,
        raw: lastRaw,
      }
    }

    const handler = toolHandlers[toolDef.name]
    if (!handler) {
      step.observation = `no handler for ${toolDef.name}`
      trace.push(step)
      return {
        finalAnswer: `L'outil ${toolDef.name} n'est pas encore implémenté côté serveur.`,
        trace,
        actions: [],
        source: modelSource,
        model: modelName,
        raw: lastRaw,
      }
    }

    try {
      const observation = await handler(effectiveToolInput, confirmed, caller)
      step.observation = observation
      trace.push(step)

      const observationText = typeof observation === 'string' ? observation : JSON.stringify(observation)
      messages.push({ role: 'assistant', content: result.text })
      messages.push({
        role: 'user',
        content: `Résultat de l'outil ${toolDef.name}:\n${observationText}\n\nContinue jusqu'à obtenir une réponse finale.`,
      })
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      step.observation = { error: errorMsg }
      trace.push(step)
      messages.push({ role: 'assistant', content: result.text })
      messages.push({
        role: 'user',
        content: `L'outil ${toolDef.name} a échoué : ${errorMsg}. Corrige ou explique le problème.`,
      })
    }
  }

  return {
    finalAnswer: "Je n'ai pas pu aboutir dans le nombre d'étapes imparti. Veuillez reformuler votre demande.",
    trace,
    actions: [],
    source: modelSource,
    model: modelName,
    raw: lastRaw,
  }
}
