/**
 * Cycle de vie d'un projet IT Vision (cycle commercial → livraison → garantie) et tableau des tâches.
 * Source unique pour l'API (transitions contrôlées) et l'interface admin (pipeline, Kanban).
 */

export const PROJECT_STATUSES = [
  'lead', 'quoted', 'negotiation', 'approved', 'in_progress', 'testing', 'completed', 'maintenance', 'on_hold', 'cancelled',
] as const
export type ProjectStatus = typeof PROJECT_STATUSES[number]

/** Phases du pipeline, dans l'ordre (hors pause et abandon). */
export const PIPELINE: ProjectStatus[] = ['lead', 'quoted', 'negotiation', 'approved', 'in_progress', 'testing', 'completed', 'maintenance']

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; short: string; color: string; group: 'commercial' | 'delivery' | 'after' | 'side' }> = {
  lead: { label: 'Prospect', short: 'Prospect', color: 'bg-stone-100 text-stone-700', group: 'commercial' },
  quoted: { label: 'Devis envoyé', short: 'Devisé', color: 'bg-blue-100 text-blue-700', group: 'commercial' },
  negotiation: { label: 'Négociation', short: 'Négo.', color: 'bg-purple-100 text-purple-700', group: 'commercial' },
  approved: { label: 'Devis accepté', short: 'Gagné', color: 'bg-emerald-100 text-emerald-700', group: 'delivery' },
  in_progress: { label: 'En réalisation', short: 'En cours', color: 'bg-sky-100 text-sky-700', group: 'delivery' },
  testing: { label: 'Recette client', short: 'Recette', color: 'bg-amber-100 text-amber-800', group: 'delivery' },
  completed: { label: 'Livré', short: 'Livré', color: 'bg-emerald-100 text-emerald-800', group: 'after' },
  maintenance: { label: 'Maintenance / garantie', short: 'Maint.', color: 'bg-indigo-100 text-indigo-700', group: 'after' },
  on_hold: { label: 'En pause', short: 'Pause', color: 'bg-orange-100 text-orange-700', group: 'side' },
  cancelled: { label: 'Perdu / annulé', short: 'Perdu', color: 'bg-red-100 text-red-700', group: 'side' },
}

const ACTIVE: ProjectStatus[] = ['lead', 'quoted', 'negotiation', 'approved', 'in_progress', 'testing']

const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  lead: ['quoted', 'negotiation', 'approved', 'on_hold', 'cancelled'],
  quoted: ['negotiation', 'approved', 'lead', 'on_hold', 'cancelled'],
  negotiation: ['quoted', 'approved', 'on_hold', 'cancelled'],
  approved: ['in_progress', 'negotiation', 'on_hold', 'cancelled'],
  in_progress: ['testing', 'approved', 'on_hold', 'cancelled'],
  testing: ['completed', 'in_progress', 'on_hold'],
  completed: ['maintenance', 'testing'],
  maintenance: ['completed'],
  on_hold: ACTIVE,
  cancelled: ['lead'],
}

/** Valeurs historiques (validateur Mongo legacy : pending / in_progress / completed / cancelled). */
export function normalizeProjectStatus(value: unknown, fallback: ProjectStatus = 'lead'): ProjectStatus {
  const s = String(value || '').trim().toLowerCase()
  if ((PROJECT_STATUSES as readonly string[]).includes(s)) return s as ProjectStatus
  if (s === 'pending') return 'lead'
  if (s === 'canceled' || s === 'rejected' || s === 'lost') return 'cancelled'
  return fallback
}

/** Statut compatible avec l'ancien validateur Mongo (avant migration). */
export function legacyProjectStatus(status: ProjectStatus): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
  if (status === 'in_progress' || status === 'testing') return 'in_progress'
  if (status === 'completed' || status === 'maintenance') return 'completed'
  if (status === 'cancelled') return 'cancelled'
  return 'pending'
}

export function allowedTransitions(from: ProjectStatus): ProjectStatus[] {
  return TRANSITIONS[from] || []
}

export function canTransitionProject(from: ProjectStatus, to: ProjectStatus) {
  return from === to || allowedTransitions(from).includes(to)
}

export interface WorkflowContext {
  acceptedQuotes: number
  sentQuotes: number
  tasksOpen: number
  milestonesOpen: number
  outstanding: number
  remainingToInvoice: number
  receptionSigned: boolean
}

export interface TransitionCheck {
  allowed: boolean
  /** Blocage levable par un administrateur (force=true avec motif). */
  blocking?: string
  warnings: string[]
}

export function checkProjectTransition(from: ProjectStatus, to: ProjectStatus, ctx: WorkflowContext): TransitionCheck {
  if (!canTransitionProject(from, to)) {
    return { allowed: false, warnings: [], blocking: `Passage « ${PROJECT_STATUS_META[from].label} » → « ${PROJECT_STATUS_META[to].label} » non prévu par le workflow` }
  }
  const warnings: string[] = []
  let blocking: string | undefined
  if (to === 'quoted' && ctx.sentQuotes + ctx.acceptedQuotes === 0) {
    warnings.push('Aucun devis envoyé n’est lié à ce projet')
  }
  if ((to === 'approved' || to === 'in_progress') && ctx.acceptedQuotes === 0) {
    blocking = 'Aucun devis accepté n’est lié au projet : liez ou faites accepter un devis avant de démarrer'
  }
  if (to === 'completed') {
    if (ctx.tasksOpen > 0) warnings.push(`${ctx.tasksOpen} tâche(s) non terminée(s)`)
    if (ctx.milestonesOpen > 0) warnings.push(`${ctx.milestonesOpen} jalon(s) non terminé(s)`)
    if (!ctx.receptionSigned) warnings.push('PV de réception non signé par le client')
    if (ctx.remainingToInvoice > 0) warnings.push('Une partie du montant contractuel reste à facturer')
  }
  if (to === 'maintenance' && ctx.outstanding > 0) warnings.push('Des factures restent à encaisser')
  return { allowed: true, blocking, warnings }
}

export interface NextAction {
  key: string
  label: string
  /** Onglet de la fiche projet ou lien. */
  tab?: 'finance' | 'tasks' | 'documents' | 'milestones' | 'overview'
  href?: string
}

export function nextActions(status: ProjectStatus, ctx: WorkflowContext & { projectId: string }): NextAction[] {
  const actions: NextAction[] = []
  const newQuote = { key: 'quote', label: 'Créer le devis du projet', href: `/admin/devis?projectId=${ctx.projectId}` }
  switch (status) {
    case 'lead':
      actions.push({ key: 'qualify', label: 'Qualifier le besoin (visite, contraintes du site)', tab: 'tasks' }, newQuote)
      break
    case 'quoted':
    case 'negotiation':
      actions.push({ key: 'follow', label: 'Relancer le client sur le devis', tab: 'finance' })
      if (ctx.sentQuotes + ctx.acceptedQuotes === 0) actions.push(newQuote)
      break
    case 'approved':
      actions.push({ key: 'plan', label: 'Planifier les tâches et jalons', tab: 'tasks' })
      if (ctx.remainingToInvoice > 0) actions.push({ key: 'deposit', label: 'Facturer l’acompte', tab: 'finance' })
      break
    case 'in_progress':
      if (ctx.tasksOpen > 0) actions.push({ key: 'tasks', label: `Suivre les ${ctx.tasksOpen} tâche(s) ouverte(s)`, tab: 'tasks' })
      actions.push({ key: 'docs', label: 'Partager photos et documents avec le client', tab: 'documents' })
      break
    case 'testing':
      if (!ctx.receptionSigned) actions.push({ key: 'reception', label: 'Faire signer le PV de réception', tab: 'overview' })
      if (ctx.remainingToInvoice > 0) actions.push({ key: 'invoice', label: 'Facturer le solde', tab: 'finance' })
      break
    case 'completed':
    case 'maintenance':
      if (ctx.outstanding > 0) actions.push({ key: 'collect', label: 'Encaisser les factures en attente', tab: 'finance' })
      if (ctx.remainingToInvoice > 0) actions.push({ key: 'invoice', label: 'Facturer le reste du contrat', tab: 'finance' })
      break
    default:
      break
  }
  return actions
}

// ─── Tableau des tâches (Kanban) ──────────────────────────────────────────────

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const
export type TaskStatus = typeof TASK_STATUSES[number]
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export type TaskPriority = typeof TASK_PRIORITIES[number]

export const TASK_STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'À faire', color: 'bg-stone-100 text-stone-700' },
  in_progress: { label: 'En cours', color: 'bg-sky-100 text-sky-700' },
  review: { label: 'En revue', color: 'bg-amber-100 text-amber-800' },
  done: { label: 'Terminé', color: 'bg-emerald-100 text-emerald-800' },
}

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'bg-stone-100 text-stone-600' },
  medium: { label: 'Moyenne', color: 'bg-blue-50 text-blue-700' },
  high: { label: 'Haute', color: 'bg-red-50 text-red-700' },
}

export interface ProjectTask {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignee?: string
  dueDate?: string | Date | null
  milestoneId?: string
  order: number
  createdAt?: string | Date
  updatedAt?: string | Date
  completedAt?: string | Date | null
}

export function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === 'string' && (TASK_STATUSES as readonly string[]).includes(v)
}

export function isTaskPriority(v: unknown): v is TaskPriority {
  return typeof v === 'string' && (TASK_PRIORITIES as readonly string[]).includes(v)
}

/** Progression d'un projet déduite des tâches (si présentes). */
export function tasksProgress(tasks: Array<{ status: string }>) {
  if (!tasks.length) return null
  return Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
}
