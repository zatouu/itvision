import { qwenChat, type ChatMessage } from './qwen'

export type AssistType = 'enhance_request' | 'analyze_request' | 'mission_help' | 'daily_tips'

interface AssistContext {
  type: AssistType
  category?: string
  description?: string
  attributes?: Record<string, any>
  question?: string
  missionStatus?: string
  profile?: any
  nearbyCount?: number
  earnings?: any
  rating?: number
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
      return [
        {
          role: 'system',
          content: `Tu es un assistant qui aide les clients sénégalais à mieux décrire leurs besoins de service. Réponds en français simple et clair. Sois concis (max 150 mots). Structure la réponse avec des sections courtes. Évite le jargon technique.`,
        },
        {
          role: 'user',
          content: `Catégorie: ${cat}
Description du client: "${ctx.description || '(vide)'}"
Attributs: ${ctx.attributes ? JSON.stringify(ctx.attributes) : 'aucun'}

Génère une description améliorée et structurée avec:
1. **Nature du problème** (1-2 phrases claires)
2. **Contexte utile** (âge installation, symptômes, quand ça a commencé)
3. **Photos utiles à prendre** (1-2 suggestions concrètes)

Reste pratique et adapté au contexte sénégalais.`,
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

    default:
      return [{ role: 'user', content: ctx.description || 'Aide-moi' }]
  }
}

export async function aiAssist(ctx: AssistContext): Promise<{ text: string; source: string; model: string }> {
  const messages = buildMessages(ctx)
  const result = await qwenChat(messages)
  return { text: result.text, source: result.source, model: result.model }
}
