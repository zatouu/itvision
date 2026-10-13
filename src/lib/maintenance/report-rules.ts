/**
 * Règles de complétude d'un rapport de maintenance, partagées entre le formulaire technicien
 * et la soumission serveur : le technicien voit avant d'envoyer exactement ce que le serveur exigera.
 */

export interface ReportRuleInput {
  interventionType?: string
  initialObservations?: string
  results?: string
  tasksPerformed?: string[]
  startTime?: string
  endTime?: string
  photosBeforeCount: number
  photosAfterCount: number
  materialsUsed?: Array<{ name?: string; quantity?: number }>
  issuesDetected?: Array<{ component?: string; reference?: string; requiresQuote?: boolean; recommendedSolution?: string }>
  followUpRecommendations?: Array<{ title?: string; requiresQuote?: boolean; estimatedCost?: number | string | null; priority?: string }>
  nextActions?: Array<{ title?: string; status?: string }>
}

export const MIN_TEXT = 10
export const MAX_DURATION_HOURS = 12

export function minutesOf(t?: string): number | null {
  const [h, m] = String(t || '').split(':').map(Number)
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m
}

/** Durée en minutes, passage à minuit compris. */
export function durationMinutes(start?: string, end?: string): number | null {
  const s = minutesOf(start)
  const e = minutesOf(end)
  if (s === null || e === null) return null
  let diff = e - s
  if (diff < 0) diff += 24 * 60
  return diff
}

const filled = (s?: string) => !!String(s || '').trim()

/** Liste des manques bloquant la soumission (vide = rapport complet). */
export function reportSubmissionErrors(r: ReportRuleInput): string[] {
  const errors: string[] = []

  if (String(r.initialObservations || '').trim().length < MIN_TEXT) {
    errors.push(`Constat initial : au moins ${MIN_TEXT} caractères`)
  }
  if (String(r.results || '').trim().length < MIN_TEXT) {
    errors.push(`Résultat de l'intervention : au moins ${MIN_TEXT} caractères`)
  }
  if (!(r.tasksPerformed || []).some(filled)) {
    errors.push('Au moins une tâche réalisée')
  }
  if (!filled(r.startTime) || !filled(r.endTime)) {
    errors.push('Heures de début et de fin')
  } else {
    const d = durationMinutes(r.startTime, r.endTime)
    if (d === null) errors.push('Format des heures invalide')
    else if (d <= 0 || d > MAX_DURATION_HOURS * 60) errors.push(`Durée d'intervention incohérente (0 à ${MAX_DURATION_HOURS} h)`)
  }

  if (r.interventionType === 'installation' && r.photosAfterCount === 0) {
    errors.push("Au moins une photo après installation")
  } else if (r.interventionType !== 'installation' && r.photosBeforeCount + r.photosAfterCount === 0) {
    errors.push('Au moins une photo (avant ou après)')
  }

  for (const m of r.materialsUsed || []) {
    if (filled(m.name) && !(Number(m.quantity) > 0)) {
      errors.push(`Matériel « ${m.name} » : quantité à renseigner`)
    }
  }

  ;(r.issuesDetected || []).forEach((issue, i) => {
    if (issue.requiresQuote && !filled(issue.recommendedSolution)) {
      errors.push(`Anomalie ${issue.component || issue.reference || i + 1} : solution recommandée requise pour le devis`)
    }
  })

  const followUps = (r.followUpRecommendations || []).filter(f => filled(f.title))
  followUps.forEach(f => {
    if (f.requiresQuote && !(Number(f.estimatedCost) > 0)) {
      errors.push(`Recommandation « ${f.title} » : montant estimé requis pour le devis`)
    }
  })
  const hasUrgent = followUps.some(f => f.priority === 'urgent')
  const hasPlanned = (r.nextActions || []).some(a => filled(a.title) && ['pending', 'scheduled'].includes(String(a.status)))
  if (hasUrgent && !hasPlanned) {
    errors.push('Une recommandation urgente demande une action de suivi planifiée')
  }

  return errors
}

/** URL d'image acceptée dans un rapport : uniquement nos propres uploads. */
export function isOwnUploadUrl(url: unknown): url is string {
  return typeof url === 'string' && url.length < 500 && /^\/(api\/)?uploads\/[\w./-]+$/.test(url) && !url.includes('..')
}
