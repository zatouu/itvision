import { qwenChat, qwenVision, type ChatMessage } from './qwen'

export type AssistType = 'enhance_request' | 'clarify_request' | 'analyze_request' | 'mission_coach' | 'mission_help' | 'daily_tips' | 'suggest_offer'

/** Contexte mission chargé côté serveur (ServiceRequest) pour les types prestataire. */
export interface MissionContext {
  subcategory?: string
  /** Nombre de photos jointes par le client à la demande (contexte textuel — pas de vision pour le coach) */
  clientImageCount?: number
  pauseReason?: string
  pauseCount?: number
  elapsedMinutes?: number
  price?: number
  urgent?: boolean
}

export interface StructuredSection {
  icon: 'tools' | 'check' | 'warning' | 'steps' | 'parts' | 'client' | 'info' | 'eye' | 'clock'
  title: string
  items: string[]
}

/** Réponse structurée commune au coach, aux questions mission et à l'analyse de demande. */
export interface StructuredAdvice {
  title: string
  summary?: string
  sections: StructuredSection[]
  askClient?: string[]
  sayToClient?: string
  difficulty?: 'Simple' | 'Moyen' | 'Complexe'
  durationMinutes?: { min: number; max: number }
}

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
  /** URLs publiques (ou data URIs) des photos du client — déclenche le modèle vision */
  imageUrls?: string[]
  missionStatus?: string
  mission?: MissionContext
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

function answersBlockOf(ctx: AssistContext): string {
  return ctx.answers && ctx.answers.length > 0
    ? `\nPrécisions données par le client:\n${ctx.answers.map(a => `- ${a.question} → ${a.answer}`).join('\n')}`
    : ''
}

/** Étapes de mission pour lesquelles un coaching est généré (clé = statut ServiceRequest). */
const COACH_STEP_GUIDANCE: Record<string, string> = {
  accepted: 'Le prestataire vient d\'être accepté. Conseille-le sur la préparation : matériel à vérifier selon la catégorie, contacter le client pour confirmer l\'adresse et l\'accès, partir avec les consommables probables.',
  on_the_way: 'Le prestataire est en route vers le client. Conseille-le sur : confirmer l\'heure d\'arrivée au client, préparer mentalement le diagnostic, sécurité routière, avoir le téléphone du client à portée de main.',
  provider_arriving: 'Le prestataire approche du lieu. Conseille-le sur : prévenir le client de l\'arrivée imminente, repérer l\'accès et le stationnement, préparer ses outils de diagnostic.',
  arrived: 'Le prestataire est arrivé chez le client. Conseille-le sur : saluer et rassurer le client, inspecter avant de toucher, confirmer la portée des travaux et le prix, sécuriser la zone (disjoncteur, eau, enfants/animaux).',
  in_progress: 'L\'intervention est en cours. Donne les étapes de travail recommandées pour cette catégorie, les points de contrôle qualité et les précautions sécurité.',
  paused: 'La mission est en pause. Conseille le prestataire sur : informer le client de la raison et de la reprise, sécuriser le chantier, noter ce qui reste à faire pour une reprise rapide.',
  awaiting_validation: 'Le prestataire a terminé et attend la validation du client. Conseille-le sur : nettoyer la zone, faire tester le résultat par le client, expliquer ce qui a été fait, préparer le règlement.',
}

function missionBlockOf(ctx: AssistContext): string {
  const m = ctx.mission
  if (!m) return ''
  const lines: string[] = []
  if (m.subcategory) lines.push(`- Sous-catégorie: ${m.subcategory}`)
  if (m.clientImageCount) lines.push(`- ${m.clientImageCount} photo(s) fournie(s) par le client`)
  if (typeof m.elapsedMinutes === 'number') lines.push(`- Temps écoulé depuis le début: ${m.elapsedMinutes} min`)
  if (typeof m.price === 'number' && m.price > 0) lines.push(`- Prix convenu: ${m.price.toLocaleString('fr-FR')} FCFA`)
  if (m.urgent) lines.push('- Mission urgente')
  if (m.pauseCount) lines.push(`- ${m.pauseCount} pause(s) déjà effectuée(s)`)
  if (m.pauseReason) lines.push(`- Dernière raison de pause: ${m.pauseReason}`)
  return lines.length > 0 ? `\nContexte mission:\n${lines.join('\n')}` : ''
}

/**
 * Prompts vision (une seule chaîne : le modèle VL ne reçoit qu'un message user avec texte + images).
 * Utilisés uniquement quand ctx.imageUrls est non vide.
 */
function buildVisionPrompt(ctx: AssistContext): string {
  const cat = ctx.category ? CATEGORY_LABELS[ctx.category] || ctx.category : ''
  const n = ctx.imageUrls?.length || 0

  if (ctx.type === 'clarify_request') {
    return `Tu aides des clients sénégalais à préciser leur demande de dépannage/service (catégorie: ${cat}). Le client a joint ${n} photo(s) de ce qu'il veut faire réparer.
Description écrite du client: "${ctx.description || '(vide)'}"
Attributs déjà renseignés: ${ctx.attributes ? JSON.stringify(ctx.attributes) : 'aucun'}

TÂCHE:
1. "observations": décris en 1 à 3 phrases courtes ce que tu VOIS réellement sur les photos (équipement, emplacement, état apparent). Uniquement du visible et certain, jamais de diagnostic ni de cause supposée. Si une photo est floue, trop sombre ou hors sujet, dis-le.
2. "questions": 3 à 4 questions MAXIMUM, ancrées sur les photos ET la description (ex: "Le disjoncteur abaissé sur la photo, c'est bien celui qui saute ?"). Chaque question porte sur un FAIT OBSERVABLE par le client (quand, où, fréquence, ce qui a changé), jamais une question technique qu'il ne peut pas vérifier. 2 à 4 options courtes quand c'est possible.
3. "photoGuidance": 0 à 2 photos supplémentaires qui aideraient VRAIMENT l'artisan à préparer son intervention (angle, distance, élément à montrer), formulées comme une consigne simple ("Prends le tableau électrique en entier, porte ouverte"). Tableau vide si les photos suffisent.

RÈGLES: français très simple, aucune invention, pas de conseil ni de réparation.
Réponds UNIQUEMENT avec un JSON valide, sans texte autour, sans markdown:
{"observations":["..."],"questions":[{"id":"q1","question":"...","options":["...","..."],"allowFreeText":true}],"photoGuidance":["..."]}`
  }

  // enhance_request
  return `Tu reformules la description d'un client pour une demande de service au Sénégal (catégorie: ${cat}). Le client a joint ${n} photo(s).
Description du client: "${ctx.description || '(vide)'}"${answersBlockOf(ctx)}

RÈGLES ABSOLUES:
1. N'invente AUCUN fait. Utilise UNIQUEMENT ce que le client a écrit/répondu et ce qui est CLAIREMENT visible sur les photos (type d'équipement, emplacement, dégât visible). Jamais de cause supposée ni de diagnostic.
2. Si une information n'est pas fournie, ne la mentionne JAMAIS.
3. Texte brut uniquement: pas de markdown, pas d'astérisques, pas de titres, pas de listes.
4. Pas de conseils, pas de suggestions, pas de mention des photos elles-mêmes ("sur la photo on voit...").
5. Écris à la première personne, comme si le client parlait. Ton naturel et simple.
6. Maximum 4 phrases. Chaque phrase correspond à un fait fourni ou visible.
7. Si la description est déjà claire et complète, retourne-la quasi identique.

Reformule en un texte fluide qui intègre les précisions.`
}

function buildMessages(ctx: AssistContext): ChatMessage[] {
  const cat = ctx.category ? CATEGORY_LABELS[ctx.category] || ctx.category : ''

  switch (ctx.type) {
    case 'enhance_request': {
      const answersBlock = answersBlockOf(ctx)
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

    case 'mission_coach': {
      const stepGuidance = COACH_STEP_GUIDANCE[ctx.missionStatus || ''] || COACH_STEP_GUIDANCE.in_progress
      return [
        {
          role: 'system',
          content: `Tu es un coach de terrain pour artisans sénégalais. À chaque étape d'une mission, tu génères une fiche de conseils structurée, adaptée à l'étape courante, à la catégorie et au contexte réel de la mission.
RÈGLES:
1. Français très simple et direct — les artisans sont souvent peu scolarisés.
2. Ne donne que des conseils utiles à l'ÉTAPE COURANTE, jamais de généralités.
3. Chaque section a une "icon" parmi: tools, check, warning, steps, parts, client, info, eye, clock.
4. Maximum 3 sections, 3 à 4 items courts par section (une phrase impérative par item).
5. "summary": une seule phrase d'action (sera affichée en aperçu sur mobile).
6. "askClient": 0 à 2 questions à poser au client si pertinent pour cette étape.
7. "sayToClient": une phrase polie que le prestataire peut dire au client à cette étape.
8. Sécurité d'abord : toute section "warning" passe avant les autres.
Réponds UNIQUEMENT avec un JSON valide, sans texte autour, sans markdown:
{"title":"...","summary":"...","sections":[{"icon":"steps","title":"...","items":["..."]}],"askClient":["..."],"sayToClient":"...","difficulty":"Simple","durationMinutes":{"min":15,"max":45}}`,
        },
        {
          role: 'user',
          content: `Catégorie: ${cat}
Description de la mission: "${ctx.description || '(non décrite)'}"
Étape actuelle: ${ctx.missionStatus || 'in_progress'}${missionBlockOf(ctx)}

GUIDANCE ÉTAPE: ${stepGuidance}

Génère la fiche coach pour cette étape précise.`,
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

function cleanStrings(arr: unknown, max: number, maxLen = 200): string[] {
  return Array.isArray(arr)
    ? arr.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map(s => s.trim().slice(0, maxLen)).slice(0, max)
    : []
}

const SECTION_ICONS: StructuredSection['icon'][] = ['tools', 'check', 'warning', 'steps', 'parts', 'client', 'info', 'eye', 'clock']
const ADVICE_DIFFICULTIES: NonNullable<StructuredAdvice['difficulty']>[] = ['Simple', 'Moyen', 'Complexe']

/** Valide et borne la réponse JSON structurée du coach / d'un type à sortie fiche. */
function sanitizeAdvice(raw: unknown): StructuredAdvice {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const title = typeof obj.title === 'string' ? obj.title.trim().slice(0, 120) : ''
  const sections: StructuredSection[] = Array.isArray(obj.sections)
    ? obj.sections
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map((s) => ({
          icon: (SECTION_ICONS.includes(s.icon as any) ? s.icon : 'info') as StructuredSection['icon'],
          title: typeof s.title === 'string' ? s.title.trim().slice(0, 60) : '',
          items: cleanStrings(s.items, 4, 160),
        }))
        .filter(s => s.title && s.items.length > 0)
        .slice(0, 4)
    : []
  if (!title || sections.length === 0) throw new Error('AI returned no valid structured advice')

  const dm = obj.durationMinutes && typeof obj.durationMinutes === 'object' ? obj.durationMinutes as Record<string, unknown> : null
  const dmMin = dm && typeof dm.min === 'number' && dm.min >= 0 ? Math.round(dm.min) : undefined
  const dmMax = dm && typeof dm.max === 'number' && dm.max >= (dmMin ?? 0) ? Math.round(dm.max) : undefined

  return {
    title,
    summary: typeof obj.summary === 'string' ? obj.summary.trim().slice(0, 300) : undefined,
    sections,
    askClient: cleanStrings(obj.askClient, 2, 200),
    sayToClient: typeof obj.sayToClient === 'string' ? obj.sayToClient.trim().slice(0, 240) : undefined,
    difficulty: ADVICE_DIFFICULTIES.includes(obj.difficulty as any) ? obj.difficulty as StructuredAdvice['difficulty'] : undefined,
    durationMinutes: dmMin !== undefined ? { min: dmMin, max: dmMax ?? dmMin } : undefined,
  }
}

const VISION_TYPES: AssistType[] = ['clarify_request', 'enhance_request']

export interface AiAssistResult {
  text: string
  source: string
  model: string
  /** true si le modèle vision a été utilisé (photos prises en compte) */
  vision?: boolean
  questions?: ClarifyQuestion[]
  observations?: string[]
  photoGuidance?: string[]
  suggestedPrice?: number
  suggestedMessage?: string
  reasoning?: string
  /** Fiche structurée (mission_coach) */
  advice?: StructuredAdvice
}

export async function aiAssist(ctx: AssistContext): Promise<AiAssistResult> {
  let useVision = VISION_TYPES.includes(ctx.type) && Array.isArray(ctx.imageUrls) && ctx.imageUrls.length > 0
  let result: Awaited<ReturnType<typeof qwenChat>>
  if (useVision) {
    try {
      result = await qwenVision(buildVisionPrompt(ctx), ctx.imageUrls!)
    } catch (visionErr) {
      // Vision indisponible (ou URLs non exploitables) → on dégrade en texte seul plutôt que d'échouer
      console.warn('[AI assist] vision failed, falling back to text:', visionErr instanceof Error ? visionErr.message : visionErr)
      useVision = false
      result = await qwenChat(buildMessages(ctx))
    }
  } else {
    result = await qwenChat(buildMessages(ctx))
  }

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
    return {
      text: '',
      questions,
      observations: useVision ? cleanStrings(parsed?.observations, 3) : undefined,
      photoGuidance: useVision ? cleanStrings(parsed?.photoGuidance, 2) : undefined,
      vision: useVision,
      source: result.source,
      model: result.model,
    }
  }

  if (ctx.type === 'mission_coach') {
    const advice = sanitizeAdvice(extractJson(result.text))
    return { text: advice.summary || advice.title, advice, source: result.source, model: result.model }
  }

  if (ctx.type === 'suggest_offer') {
    const parsed = extractJson(result.text)
    const suggestedPrice = typeof parsed?.suggestedPrice === 'number' ? parsed.suggestedPrice : undefined
    const suggestedMessage = typeof parsed?.suggestedMessage === 'string' ? parsed.suggestedMessage.trim() : undefined
    const reasoning = typeof parsed?.reasoning === 'string' ? parsed.reasoning.trim() : undefined
    if (!suggestedPrice || !suggestedMessage) throw new Error('AI returned no valid offer suggestion')
    return { text: '', suggestedPrice, suggestedMessage, reasoning, source: result.source, model: result.model }
  }

  return { text: result.text, vision: useVision, source: result.source, model: result.model }
}
