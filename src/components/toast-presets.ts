import { ToastOptions, ToastType } from './ToastProvider'

export type ActionKind = 'create' | 'update' | 'delete' | 'validate' | 'reject' | 'publish' | 'load' | 'error'

type PresetKey = `${ActionKind}:${'success' | 'error' | 'info' | 'warning'}`

type Preset = Required<Pick<ToastOptions, 'title' | 'description' | 'type' | 'durationMs'>>

const DEFAULT_DURATION = 4000
const ERROR_DURATION = 6000

export const toastPresets: Record<PresetKey, Preset> = {
  'create:success': { type: 'success', title: 'Création effectuée', description: 'L’élément a été créé.', durationMs: DEFAULT_DURATION },
  'create:error':   { type: 'error',   title: 'Création échouée',  description: 'Impossible de créer l’élément.', durationMs: ERROR_DURATION },
  'create:info':    { type: 'info',    title: 'Création',          description: 'Création en cours...', durationMs: DEFAULT_DURATION },
  'create:warning': { type: 'warning', title: 'Vérifier création', description: 'Données à valider.', durationMs: DEFAULT_DURATION },

  'update:success': { type: 'success', title: 'Mise à jour réussie', description: 'L’élément a été mis à jour.', durationMs: DEFAULT_DURATION },
  'update:error':   { type: 'error',   title: 'Mise à jour échouée', description: 'Impossible de mettre à jour.', durationMs: ERROR_DURATION },
  'update:info':    { type: 'info',    title: 'Mise à jour',        description: 'Traitement en cours...', durationMs: DEFAULT_DURATION },
  'update:warning': { type: 'warning', title: 'Vérifier données',   description: 'Champs à corriger.', durationMs: DEFAULT_DURATION },

  'delete:success': { type: 'success', title: 'Suppression réussie', description: 'L’élément a été supprimé.', durationMs: DEFAULT_DURATION },
  'delete:error':   { type: 'error',   title: 'Suppression échouée', description: 'Impossible de supprimer.', durationMs: ERROR_DURATION },
  'delete:info':    { type: 'info',    title: 'Suppression',         description: 'Traitement en cours...', durationMs: DEFAULT_DURATION },
  'delete:warning': { type: 'warning', title: 'Attention',           description: 'Action irréversible.', durationMs: DEFAULT_DURATION },

  'validate:success': { type: 'success', title: 'Validation réussie', description: 'Le rapport est validé.', durationMs: DEFAULT_DURATION },
  'validate:error':   { type: 'error',   title: 'Validation échouée', description: 'Impossible de valider.', durationMs: ERROR_DURATION },
  'validate:info':    { type: 'info',    title: 'Validation',         description: 'Validation en cours...', durationMs: DEFAULT_DURATION },
  'validate:warning': { type: 'warning', title: 'Vérifier rapport',   description: 'Champs manquants.', durationMs: DEFAULT_DURATION },

  'reject:success': { type: 'success', title: 'Rejet enregistré', description: 'Le rapport a été rejeté.', durationMs: DEFAULT_DURATION },
  'reject:error':   { type: 'error',   title: 'Rejet échoué',      description: 'Impossible de rejeter.', durationMs: ERROR_DURATION },
  'reject:info':    { type: 'info',    title: 'Rejet',             description: 'Traitement en cours...', durationMs: DEFAULT_DURATION },
  'reject:warning': { type: 'warning', title: 'Motif requis',      description: 'Veuillez renseigner le motif.', durationMs: DEFAULT_DURATION },

  'publish:success': { type: 'success', title: 'Publication réussie', description: 'Le rapport est publié.', durationMs: DEFAULT_DURATION },
  'publish:error':   { type: 'error',   title: 'Publication échouée', description: 'Impossible de publier.', durationMs: ERROR_DURATION },
  'publish:info':    { type: 'info',    title: 'Publication',        description: 'Publication en cours...', durationMs: DEFAULT_DURATION },
  'publish:warning': { type: 'warning', title: 'À vérifier',         description: 'Vérifier la conformité.', durationMs: DEFAULT_DURATION },

  'load:success': { type: 'success', title: 'Chargement réussi',    description: 'Données récupérées.', durationMs: DEFAULT_DURATION },
  'load:error':   { type: 'error',   title: 'Chargement échoué',    description: 'Impossible de charger.', durationMs: ERROR_DURATION },
  'load:info':    { type: 'info',    title: 'Chargement',           description: 'Récupération des données...', durationMs: DEFAULT_DURATION },
  'load:warning': { type: 'warning', title: 'Données partielles',   description: 'Certaines données manquent.', durationMs: DEFAULT_DURATION },

  'error:success': { type: 'success', title: 'Erreur résolue',       description: 'Le problème a été corrigé.', durationMs: DEFAULT_DURATION },
  'error:error':   { type: 'error',   title: 'Erreur',               description: 'Une erreur est survenue.', durationMs: ERROR_DURATION },
  'error:info':    { type: 'info',    title: 'Diagnostic',           description: 'Analyse du problème...', durationMs: DEFAULT_DURATION },
  'error:warning': { type: 'warning', title: 'Attention',           description: 'Problème détecté.', durationMs: DEFAULT_DURATION },
}

export function useToastPresetKey(kind: ActionKind, type: ToastType): PresetKey {
  return `${kind}:${type}` as PresetKey
}

