/**
 * Droits des membres d'un espace entreprise (portail client). Sans dépendance serveur :
 * partagé par l'API (domain-access) et l'écran « Équipe et droits ».
 * Le client gère lui-même ses membres ; IT Vision ne garde que l'activation des services (Client.permissions).
 */

export const COMPANY_ROLES = ['owner', 'admin', 'finance', 'technical', 'viewer'] as const
export type CompanyRole = (typeof COMPANY_ROLES)[number]

export type CompanyCapability =
  | 'portal:access'
  | 'reports:view'
  | 'finance:view'
  | 'quotes:respond'
  | 'maintenance:request'
  | 'tickets:write'
  | 'sourcing:request'
  | 'interventions:ack'
  | 'interventions:feedback'
  | 'company:manage'
  | 'team:manage'

export const ROLE_CAPABILITIES: Record<CompanyRole, CompanyCapability[]> = {
  owner: ['portal:access', 'reports:view', 'finance:view', 'quotes:respond', 'maintenance:request', 'tickets:write', 'sourcing:request', 'interventions:ack', 'interventions:feedback', 'company:manage', 'team:manage'],
  admin: ['portal:access', 'reports:view', 'finance:view', 'quotes:respond', 'maintenance:request', 'tickets:write', 'sourcing:request', 'interventions:ack', 'interventions:feedback', 'company:manage', 'team:manage'],
  finance: ['portal:access', 'reports:view', 'finance:view', 'quotes:respond', 'tickets:write', 'sourcing:request', 'interventions:feedback'],
  technical: ['portal:access', 'reports:view', 'maintenance:request', 'tickets:write', 'sourcing:request', 'interventions:ack', 'interventions:feedback'],
  viewer: ['portal:access', 'reports:view', 'finance:view'],
}

/** Profils proposés à l'invitation ; les droits restent ajustables un par un. */
export const ROLE_PRESETS: Array<{ role: CompanyRole; label: string; description: string }> = [
  { role: 'admin', label: 'Administrateur', description: "Tous les droits, dont la gestion de l'équipe et de la personnalisation." },
  { role: 'finance', label: 'Devis et factures', description: 'Consulte les finances, accepte ou refuse les devis, suit les interventions.' },
  { role: 'technical', label: 'Technique', description: 'Demande et valide les interventions, ouvre des tickets.' },
  { role: 'viewer', label: 'Consultation', description: 'Consulte les documents et rapports, sans rien valider.' },
]

export const ROLE_LABEL: Record<CompanyRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  finance: 'Devis et factures',
  technical: 'Technique',
  viewer: 'Consultation',
}

/** Droits réglables, regroupés pour l'écran (portal:access est implicite). */
export const CAPABILITY_GROUPS: Array<{ title: string; items: Array<{ cap: CompanyCapability; label: string; hint: string; service?: 'reports' | 'maintenance' }> }> = [
  {
    title: 'Devis, factures et finances',
    items: [
      { cap: 'finance:view', label: 'Voir les devis, factures et finances', hint: 'Montants, échéances, téléchargement des PDF.' },
      { cap: 'quotes:respond', label: 'Accepter ou refuser les devis', hint: "Signature électronique au nom de l'entreprise, contre-propositions." },
    ],
  },
  {
    title: 'Interventions et support',
    items: [
      { cap: 'maintenance:request', label: 'Demander une intervention', hint: 'Nouvelle demande de maintenance.', service: 'maintenance' },
      { cap: 'interventions:ack', label: 'Valider les interventions et réceptionner les travaux', hint: 'Bon de fin de travaux, PV de réception, réserves.' },
      { cap: 'interventions:feedback', label: 'Noter les interventions', hint: 'Avis sur la qualité du service.' },
      { cap: 'tickets:write', label: 'Ouvrir et suivre des tickets', hint: 'Demandes de support.' },
      { cap: 'sourcing:request', label: 'Demander un équipement (Trouvez-moi)', hint: 'Demandes de sourcing de matériel.' },
    ],
  },
  {
    title: 'Documents',
    items: [
      { cap: 'reports:view', label: 'Consulter les rapports', hint: "Rapports d'intervention et de maintenance.", service: 'reports' },
    ],
  },
  {
    title: 'Administration de l’espace',
    items: [
      { cap: 'company:manage', label: "Modifier la fiche de l'entreprise et la personnalisation", hint: 'Coordonnées, logo, couleur, préférences.' },
      { cap: 'team:manage', label: "Gérer l'équipe et les droits", hint: 'Inviter, retirer des collègues et régler leurs droits.' },
    ],
  },
]

export const ASSIGNABLE_CAPABILITIES: CompanyCapability[] = CAPABILITY_GROUPS.flatMap(g => g.items.map(i => i.cap))

export function isCompanyRole(v: unknown): v is CompanyRole {
  return typeof v === 'string' && (COMPANY_ROLES as readonly string[]).includes(v)
}

/** Droits personnalisés valides (portal:access toujours inclus), ou null si la valeur est absente/invalide. */
export function sanitizeCapabilities(v: unknown): CompanyCapability[] | null {
  if (!Array.isArray(v)) return null
  const set = new Set<CompanyCapability>(['portal:access'])
  for (const c of v) if ((ASSIGNABLE_CAPABILITIES as string[]).includes(c)) set.add(c as CompanyCapability)
  return [...set]
}

/** Droits d'un membre avant application des services activés par IT Vision. */
export function memberCapabilities(role: CompanyRole, custom?: unknown): CompanyCapability[] {
  if (role === 'owner') return ROLE_CAPABILITIES.owner
  return sanitizeCapabilities(custom) || ROLE_CAPABILITIES[role]
}

/** Groupes de notifications réglables par chaque membre (catégories de notifyCompany). */
export const NOTIFY_GROUPS: Array<{ key: string; label: string; hint: string; categories: string[] }> = [
  { key: 'project', label: 'Avancement des projets', hint: 'Étapes franchies, nouveaux documents et photos', categories: ['project'] },
  { key: 'finance', label: 'Devis et factures', hint: 'Nouveaux devis, factures, paiements et relances', categories: ['quote', 'invoice', 'payment'] },
  { key: 'intervention', label: 'Interventions', hint: 'Planification, technicien sur place, rapports', categories: ['intervention', 'report', 'contract'] },
  { key: 'ticket', label: 'Support', hint: 'Réponses à vos demandes', categories: ['ticket'] },
  { key: 'team', label: 'Équipe', hint: 'Arrivées et changements de droits', categories: ['team'] },
]
const NOTIFY_CATEGORIES = NOTIFY_GROUPS.flatMap(g => g.categories)

export function sanitizeNotifyMuted(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((c): c is string => typeof c === 'string' && NOTIFY_CATEGORIES.includes(c)))] : []
}

/** Couleur d'accent de l'espace : hex #RRGGBB uniquement. */
export function sanitizeBrandColor(v: unknown): string | null {
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim().toLowerCase() : null
}

// Nuances dérivées de la couleur choisie : remplacent la palette « emerald » du portail (Tailwind v4 = variables CSS)
const SHADES: Array<[string, string]> = [
  ['50', 'color-mix(in oklab, var(--brand) 7%, white)'],
  ['100', 'color-mix(in oklab, var(--brand) 15%, white)'],
  ['200', 'color-mix(in oklab, var(--brand) 30%, white)'],
  ['300', 'color-mix(in oklab, var(--brand) 48%, white)'],
  ['400', 'color-mix(in oklab, var(--brand) 70%, white)'],
  ['500', 'color-mix(in oklab, var(--brand) 88%, white)'],
  ['600', 'var(--brand)'],
  ['700', 'color-mix(in oklab, var(--brand) 82%, black)'],
  ['800', 'color-mix(in oklab, var(--brand) 66%, black)'],
  ['900', 'color-mix(in oklab, var(--brand) 52%, black)'],
  ['950', 'color-mix(in oklab, var(--brand) 36%, black)'],
]

export function brandThemeStyle(color: string | null | undefined): Record<string, string> | undefined {
  const brand = sanitizeBrandColor(color)
  if (!brand) return undefined
  const style: Record<string, string> = { '--brand': brand }
  for (const [shade, value] of SHADES) style[`--color-emerald-${shade}`] = value
  return style
}

/** Événement émis par la page Paramètres pour appliquer nom / logo / couleur au portail sans recharger. */
export const PORTAL_BRANDING_EVENT = 'portal-branding'
export type PortalBranding = { companyName?: string; companyLogo?: string | null; brandColor?: string | null }

export const BRAND_PRESETS: Array<{ label: string; color: string }> = [
  { label: 'Vert IT Vision', color: '#059669' },
  { label: 'Bleu', color: '#2563eb' },
  { label: 'Bleu nuit', color: '#1e3a8a' },
  { label: 'Turquoise', color: '#0d9488' },
  { label: 'Violet', color: '#7c3aed' },
  { label: 'Rouge', color: '#dc2626' },
  { label: 'Orange', color: '#ea580c' },
  { label: 'Ardoise', color: '#475569' },
]
