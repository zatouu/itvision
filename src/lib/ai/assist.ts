import { qwenChat, type ChatMessage } from './qwen'

export type AssistType = 'enhance_request' | 'clarify_request' | 'analyze_request' | 'mission_help' | 'daily_tips' | 'suggest_offer'

interface MarketPriceData {
  category: string
  count: number
  medianPrice: number
  minPrice: number
  maxPrice: number
  avgPrice: number
}

interface AssistContext {
  type: AssistType
  category?: string
  description?: string
  attributes?: Record<string, any>
  answers?: Array<{ question: string; answer: string }>
  question?: string
  missionStatus?: string
  profile?: any
  nearbyCount?: number
  earnings?: any
  rating?: number
  // suggest_offer
  requestBudget?: number
  marketPrices?: MarketPriceData
  providerCompletedMissions?: number
}

export interface ClarifyQuestion {
  id: string
  question: string
  options?: string[]
  allowFreeText?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  electricite: 'Électricité',
  plomberie: 'Plomberie',
  menuiserie: 'Menuiserie',
  peinture: 'Peinture',
  climatisation: 'Climatisation',
  securite: 'Sécurité',
  maconnerie: 'Maçonnerie',
  nettoyage: 'Nettoyage',
  demenagement: 'Déménagement',
  autre: 'Autre',
}

function buildMessages(ctx: AssistContext): ChatMessage[] {
  const cat = ctx.category ? CATEGORY_LABELS[ctx.category] || ctx.category : ''

  switch (ctx.type) {
    case 'enhance_request': {
      const answersBlock = ctx.answers && ctx.answers.length > 0
        ? `\nPrécisions données par le client:\n${ctx.answers.map(a => `- ${a.question} → ${a.answer}`).join('\n')}`
        : ''
      return [
        {
          role: 'system',
          content: `Tu reformules la description d'un client pour une demande de service au Sénégal. RÈGLES ABSOLUES:
1. N'invente AUCUN fait. Utilise UNIQUEMENT les informations fournies par le client.
2. Si une information n'est pas fournie (âge de l'installation, date de début, etc.), ne la mentionne JAMAIS.
3. Texte brut uniquement: pas de markdown, pas d'astérisques, pas de titres, pas de listes numérotées.
4. Pas de conseils, pas de suggestions de photos, pas de diagnostic technique.
5. Écris à la première personne, comme si le client parlait. Ton naturel et simple.
6. Maximum 4 phrases. Chaque phrase doit correspondre à un fait fourni.
7. Si la description est déjà claire et complète, retourne-la quasi identique.`,
        },
        {
          role: 'user',
          content: `Catégorie: ${cat}
Description du client: "${ctx.description || '(vide)'}"${answersBlock}

Reformule en un texte fluide qui intègre les précisions. Rappel: aucun fait inventé, texte brut.`,
        },
      ]
    }

    case 'clarify_request': {
      return [
        {
          role: 'system',
          content: `Tu aides des clients sénégalais à préciser leur demande de dépannage/service. Ton rôle: poser les questions dont les réponses aideront VRAIMENT l'artisan à préparer son intervention.
RÈGLES:
1. Génère 3 à 4 questions MAXIMUM, spécifiques au problème décrit (jamais génériques).
2. Chaque question doit porter sur un FAIT OBSERVABLE par le client (quand, où, fréquence, quel équipement, qu'est-ce qui a changé récemment) — jamais de question technique que le client ne peut pas vérifier.
3. Propose 2 à 4 options de réponse courtes quand c'est possible.
4. Questions en français très simple.
5. Réponds UNIQUEMENT avec un JSON valide, sans texte autour, sans markdown, au format:
{"questions":[{"id":"q1","question":"...","options":["...","..."],"allowFreeText":true}]}`,
        },
        {
          role: 'user',
          content: `Catégorie: ${cat}
Description du client: "${ctx.description || '(vide)'}"
Attributs déjà renseignés: ${ctx.attributes ? JSON.stringify(ctx.attributes) : 'aucun'}

Génère les questions de clarification les plus utiles pour ce problème précis.`,
        },
      ]
    }

    case 'analyze_request': {
      return [
        {
          role: 'system',
          content: `Tu es un expert technique qui aide des artisans sénégalais à analyser des demandes de service. Réponds en français simple. Sois concis (max 200 mots). Les artisans sont souvent analphabètes — utilise un langage très simple et direct.`,
        },
        {
          role: 'user',
          content: `Catégorie: ${cat}
Description client: "${ctx.description || '(vide)'}"
Attributs: ${ctx.attributes ? JSON.stringify(ctx.attributes) : 'aucun'}

Analyse cette demande et donne:
1. **Diagnostic probable** (2-3 hypothèses max, en termes simples)
2. **Matériel probablement nécessaire** (liste courte)
3. **Difficulté** (Simple / Moyen / Complexe)
4. **Précautions sécurité** (si applicable, 1-2 points importants)
5. **Questions à poser au client** (2 max)`,
        },
      ]
    }

    case 'mission_help': {
      return [
        {
          role: 'system',
          content: `Tu es un conseiller technique pour artisans sénégalais sur le terrain. Réponds en français très simple et direct. Sois concis (max 200 mots). Donne des étapes claires et numérotées. Mentionne toujours la sécurité si pertinent.`,
        },
        {
          role: 'user',
          content: `Catégorie: ${cat}
Description mission: "${ctx.description || ''}"
Statut actuel: ${ctx.missionStatus || 'en cours'}
Question de l'artisan: "${ctx.question || 'Comment procéder ?'}"

Donne:
1. **Cause possible** du problème (1-2 phrases simples)
2. **Étapes de diagnostic** (numérotées, simples)
3. **Solution recommandée** (étapes numérotées)
4. **⚠️ Sécurité** (si applicable, en gras)`,
        },
      ]
    }

    case 'daily_tips': {
      const p = ctx.profile || {}
      return [
        {
          role: 'system',
          content: `Tu es un coach pour prestataires de services au Sénégal. Génère 3 conseils pratiques et personnalisés en français simple. Sois motivant mais concret. Chaque conseil: titre court + 1 phrase d'explication. Format: une ligne par conseil avec un emoji.`,
        },
        {
          role: 'user',
          content: `Profil prestataire:
- Spécialité: ${cat || 'général'}
- Note moyenne: ${ctx.rating || 'nouveau'}/5
- Missions terminées: ${p.completedMissions || 0}
- Demandes proches aujourd'hui: ${ctx.nearbyCount || 0}
- Revenus 7 jours: ${ctx.earnings?.last7Days || 0} FCFA
- En ligne: ${p.online ? 'oui' : 'non'}
- Vérifié KYC: ${p.kycVerified ? 'oui' : 'non'}

Génère 3 conseils personnalisés pour aujourd'hui. Adapte-les au profil et à la situation.`,
        },
      ]
    }

    case 'suggest_offer': {
      const mp = ctx.marketPrices
      const marketBlock = mp && mp.count > 0
        ? `\nDonnées de marché réelles (missions complétées au Sénégal, catégorie ${cat}):
- ${mp.count} missions terminées
- Prix médian: ${mp.medianPrice.toLocaleString('fr-FR')} FCFA
- Prix minimum: ${mp.minPrice.toLocaleString('fr-FR')} FCFA
- Prix maximum: ${mp.maxPrice.toLocaleString('fr-FR')} FCFA
- Prix moyen: ${mp.avgPrice.toLocaleString('fr-FR')} FCFA`
        : `\nAucune donnée historique disponible pour cette catégorie. Base-toi sur les prix usuels au Sénégal pour cette catégorie de service.`

      return [
        {
          role: 'system',
          content: `Tu es un assistant qui aide les prestataires de services au Sénégal à faire des offres compétitives. Tu connais les prix du marché local (Dakar et autres villes sénégalaises).
RÈGLES:
1. Le prix suggéré doit être réaliste pour le marché sénégalais (en FCFA).
2. Si le budget du client est mentionné, reste proche ou légèrement en dessous.
3. Si des données de marché réelles sont fournies, utilise-les comme référence principale.
4. Le message doit être professionnel, court (max 2 phrases), en français simple.
5. Mentionne brièvement pourquoi ce prix (expérience, rapidité, qualité).
6. Réponds UNIQUEMENT avec un JSON valide: {"suggestedPrice": nombre, "suggestedMessage": "texte", "reasoning": "1 phrase courte"}`,
        },
        {
          role: 'user',
          content: `Catégorie: ${cat}
Description de la demande: "${ctx.description || '(non décrite)'}"
Budget indiqué par le client: ${ctx.requestBudget ? `${ctx.requestBudget.toLocaleString('fr-FR')} FCFA` : 'non précisé'}${marketBlock}
Profil prestataire: ${ctx.providerCompletedMissions || 0} missions terminées, note ${ctx.rating || 'nouvelle'}

Suggère un prix d'offre compétitif et un message professionnel pour répondre à cette demande.`,
        },
      ]
    }

    default:
      return [{ role: 'user', content: ctx.description || 'Aide-moi' }]
  }
}

function extractJson(raw: string): any {
  // Retirer les éventuels code fences et texte autour
  const cleaned = raw.replace(/```(?:json)?/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON found in AI response')
  return JSON.parse(cleaned.slice(start, end + 1))
}

export async function aiAssist(ctx: AssistContext): Promise<{ text: string; source: string; model: string; questions?: ClarifyQuestion[]; suggestedPrice?: number; suggestedMessage?: string; reasoning?: string }> {
  const messages = buildMessages(ctx)
  const result = await qwenChat(messages)

  if (ctx.type === 'clarify_request') {
    const parsed = extractJson(result.text)
    const questions: ClarifyQuestion[] = Array.isArray(parsed?.questions)
      ? parsed.questions
          .filter((q: any) => q && typeof q.question === 'string' && q.question.trim())
          .slice(0, 4)
          .map((q: any, i: number) => ({
            id: typeof q.id === 'string' ? q.id : `q${i + 1}`,
            question: q.question.trim(),
            options: Array.isArray(q.options) ? q.options.filter((o: any) => typeof o === 'string' && o.trim()).slice(0, 4) : undefined,
            allowFreeText: q.allowFreeText !== false,
          }))
      : []
    if (questions.length === 0) throw new Error('AI returned no valid questions')
    return { text: '', questions, source: result.source, model: result.model }
  }

  if (ctx.type === 'suggest_offer') {
    const parsed = extractJson(result.text)
    const suggestedPrice = typeof parsed?.suggestedPrice === 'number' ? parsed.suggestedPrice : undefined
    const suggestedMessage = typeof parsed?.suggestedMessage === 'string' ? parsed.suggestedMessage.trim() : undefined
    const reasoning = typeof parsed?.reasoning === 'string' ? parsed.reasoning.trim() : undefined
    if (!suggestedPrice || !suggestedMessage) throw new Error('AI returned no valid offer suggestion')
    return { text: '', suggestedPrice, suggestedMessage, reasoning, source: result.source, model: result.model }
  }

  return { text: result.text, source: result.source, model: result.model }
}
