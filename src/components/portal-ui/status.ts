// Maps de statuts/priorités/types du portail entreprise — une seule source.
// Les libellés peuvent varier selon le domaine métier (ex. `sent` = « Envoyé »
// pour un devis mais « À régler » pour une facture) : choisir la bonne map.

import {
  AlertTriangle, Ban, CheckCircle, Clock, FileText, FolderKanban,
  History, LifeBuoy, MessageSquare, Receipt, Shield, Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TONE } from './tokens'

export interface StatusDef {
  label: string
  color: string
  icon?: LucideIcon
}

const S = (label: string, color: string, icon?: LucideIcon): StatusDef => ({ label, color, icon })

// Lookup avec fallback : entrée du map, sinon clé de repli, sinon neutre + clé brute.
export function statusDef(
  map: Record<string, StatusDef>,
  key: string | null | undefined,
  fallback?: string,
): StatusDef {
  if (key && map[key]) return map[key]
  if (fallback && map[fallback]) return map[fallback]
  return { label: key || '—', color: TONE.neutral }
}

// ── Générique (tableau de bord, listes transverses) ──
export const genericStatus: Record<string, StatusDef> = {
  active: S('Actif', TONE.emerald),
  in_progress: S('En cours', TONE.sky),
  completed: S('Terminé', TONE.stone),
  expired: S('Expiré', TONE.red),
  pending: S('En attente', TONE.amber),
  draft: S('Brouillon', TONE.neutral),
  sent: S('Envoyé', TONE.sky),
  overdue: S('En retard', TONE.red),
  open: S('Ouvert', TONE.orange),
  urgent: S('Urgent', TONE.red),
  high: S('Haute', TONE.orange),
  medium: S('Normale', TONE.amber),
  low: S('Faible', TONE.stone),
  approved: S('Approuvé', TONE.emerald),
  quoted: S('Devis', TONE.stone),
  maintenance: S('Maintenance', TONE.teal),
  on_hold: S('En pause', TONE.neutral),
  preventive: S('Préventif', TONE.emerald),
  curative: S('Curatif', TONE.orange),
  full: S('Complet', TONE.emerald),
  basic: S('Basique', TONE.stone),
  installation: S('Installation', TONE.sky),
  support: S('Support', TONE.emerald),
}

// ── Contrats ──
export const contractStatus: Record<string, StatusDef> = {
  active: S('Actif', TONE.emerald, CheckCircle),
  draft: S('Brouillon', TONE.neutral, Clock),
  suspended: S('Suspendu', TONE.amber, AlertTriangle),
  expired: S('Expiré', TONE.red, AlertTriangle),
  cancelled: S('Annulé', TONE.neutral, AlertTriangle),
}
export const contractTypeLabel: Record<string, string> = {
  preventive: 'Préventif', curative: 'Curatif', full: 'Complet', basic: 'Basique',
}
export const contractTypeText: Record<string, string> = {
  preventive: 'text-sky-700', curative: 'text-orange-600',
  full: 'text-emerald-700', basic: 'text-stone-600',
}

// ── Interventions ──
export const interventionStatus: Record<string, StatusDef> = {
  planned: S('Planifiée', TONE.sky),
  pending: S('Planifiée', TONE.sky),
  scheduled: S('Planifiée', TONE.sky),
  in_progress: S('En cours', TONE.amber),
  completed: S('Terminée', TONE.emerald),
  cancelled: S('Annulée', TONE.neutral),
  draft: S('Brouillon', TONE.neutral),
}
export const interventionTypeLabel: Record<string, string> = {
  emergency: 'Urgence', maintenance: 'Maintenance', installation: 'Installation',
  repair: 'Réparation', inspection: 'Inspection', preventive: 'Préventive',
  curative: 'Curative', support: 'Support',
}
// Priorités au féminin (pages détail intervention)
export const interventionPriority: Record<string, StatusDef> = {
  low: S('Faible', TONE.neutral),
  medium: S('Normale', TONE.amber),
  high: S('Haute', TONE.orange),
  urgent: S('Urgente', TONE.red),
  critical: S('Critique', TONE.redDeep),
}
// Priorités génériques (listes, tickets)
export const priority: Record<string, StatusDef> = {
  critical: S('Critique', TONE.red),
  urgent: S('Urgent', TONE.red),
  high: S('Haute', TONE.orange),
  medium: S('Normale', TONE.amber),
  low: S('Basse', TONE.neutral),
}

// ── Projets ──
export const projectStatus: Record<string, StatusDef> = {
  lead: S('Prospect', TONE.neutral),
  quoted: S('Devis', TONE.sky),
  negotiation: S('Négociation', TONE.amber),
  approved: S('Approuvé', TONE.sky),
  in_progress: S('En cours', TONE.emerald),
  testing: S('Tests', TONE.teal),
  completed: S('Terminé', TONE.stone),
  maintenance: S('Maintenance', TONE.teal),
  on_hold: S('En pause', TONE.orange),
}
export const milestoneIcon: Record<string, LucideIcon> = {
  completed: CheckCircle, in_progress: Clock, delayed: AlertTriangle, pending: Clock,
}

// ── Documents financiers ──
export const quoteStatus: Record<string, StatusDef> = {
  draft: S('Brouillon', TONE.neutral),
  sent: S('Envoyé', TONE.sky),
  accepted: S('Accepté', TONE.emerald),
  rejected: S('Refusé', TONE.red),
}
// Réponse client — libellés orientés action (liste documents)
export const quoteClientResponse: Record<string, StatusDef> = {
  pending: S('En attente de votre réponse', TONE.amber),
  accepted: S('Vous avez accepté', TONE.emerald),
  rejected: S('Vous avez refusé', TONE.red),
  counter_proposed: S('Contre-proposition envoyée', TONE.sky),
}
// Réponse client — libellés courts (détail devis)
export const quoteClientResponseShort: Record<string, StatusDef> = {
  pending: S('En attente', TONE.amber),
  accepted: S('Accepté', TONE.emerald),
  rejected: S('Refusé', TONE.red),
  counter_proposed: S('Contre-proposition', TONE.sky),
}
export const invoiceStatus: Record<string, StatusDef> = {
  draft: S('Brouillon', TONE.neutral, Clock),
  sent: S('À régler', TONE.sky, Clock),
  paid: S('Payée', TONE.emerald, CheckCircle),
  overdue: S('En retard', TONE.red, AlertTriangle),
  cancelled: S('Annulée', TONE.neutral, Ban),
}

// ── Support ──
export const ticketStatus: Record<string, StatusDef> = {
  open: S('Ouvert', TONE.orange, Clock),
  in_progress: S('En traitement', TONE.sky, Clock),
  waiting_client: S('Votre retour', TONE.amber, AlertTriangle),
  waiting: S('En attente', TONE.neutral, Clock),
  resolved: S('Résolu', TONE.emerald, CheckCircle),
  closed: S('Fermé', TONE.neutral, CheckCircle),
}
export const ticketCategoryLabel: Record<string, string> = {
  incident: 'Incident', request: 'Demande', technical: 'Technique',
  billing: 'Facturation', urgent: 'Urgence', general: 'Général', change: 'Changement',
}
export const ticketActionLabel: Record<string, string> = {
  status_change: 'Changement de statut', assignment: 'Assignation', note: 'Note', message: 'Message',
}

// ── Rapports ──
export const reportType: Record<string, StatusDef> = {
  maintenance: S('Maintenance', TONE.sky),
  installation: S('Installation', TONE.emerald),
  repair: S('Réparation', TONE.orange),
  inspection: S('Inspection', TONE.teal),
  emergency: S('Urgence', TONE.red),
}
export const severity: Record<string, StatusDef> = {
  low: S('Faible', TONE.neutral),
  medium: S('Modéré', TONE.amber),
  high: S('Élevé', TONE.orange),
  critical: S('Critique', TONE.red),
}

// ── Activité ──
export const activityBadge: Record<string, string> = {
  ok: TONE.emerald,
  neutral: TONE.neutral,
  action: TONE.amber,
  alert: TONE.red,
}
export const activityIcon: Record<string, { icon: LucideIcon; color: string }> = {
  contract: { icon: Shield, color: 'bg-emerald-50 text-emerald-700' },
  intervention: { icon: Wrench, color: 'bg-sky-50 text-sky-700' },
  project: { icon: FolderKanban, color: 'bg-teal-50 text-teal-700' },
  quote: { icon: FileText, color: 'bg-amber-50 text-amber-700' },
  invoice: { icon: Receipt, color: 'bg-stone-100 text-stone-600' },
  ticket: { icon: LifeBuoy, color: 'bg-orange-50 text-orange-700' },
  comment: { icon: MessageSquare, color: 'bg-stone-100 text-stone-500' },
  audit: { icon: History, color: 'bg-stone-100 text-stone-500' },
}
