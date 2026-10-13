/**
 * Domaines d'activité ITV et cycle de vie d'un projet vu par le client (portail entreprise).
 * Sans dépendance serveur : utilisé par les pages, les API et les notifications.
 */

export type ItvDomain =
  | 'videosurveillance' | 'controle_acces' | 'alarme' | 'visiophonie'
  | 'domotique' | 'incendie' | 'reseau' | 'maintenance' | 'autre'

export const ITV_DOMAINS: Record<ItvDomain, { label: string; short: string; icon: string; chip: string; accent: string; keywords: string[] }> = {
  videosurveillance: { label: 'Vidéosurveillance', short: 'Vidéo', icon: 'cctv', chip: 'bg-sky-50 text-sky-700 ring-sky-600/20', accent: 'bg-sky-500', keywords: ['video', 'camera', 'cctv', 'surveillance', 'nvr', 'dvr'] },
  controle_acces: { label: "Contrôle d'accès", short: 'Accès', icon: 'key', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20', accent: 'bg-indigo-500', keywords: ['acces', 'badge', 'biometr', 'pointeuse', 'tourniquet', 'barriere', 'portail'] },
  alarme: { label: 'Alarme anti-intrusion', short: 'Alarme', icon: 'siren', chip: 'bg-rose-50 text-rose-700 ring-rose-600/20', accent: 'bg-rose-500', keywords: ['alarme', 'intrusion', 'detecteur de mouvement'] },
  visiophonie: { label: 'Visiophonie et interphonie', short: 'Visiophonie', icon: 'door', chip: 'bg-violet-50 text-violet-700 ring-violet-600/20', accent: 'bg-violet-500', keywords: ['visiophon', 'interphon', 'portier'] },
  domotique: { label: 'Domotique', short: 'Domotique', icon: 'home', chip: 'bg-teal-50 text-teal-700 ring-teal-600/20', accent: 'bg-teal-500', keywords: ['domotique', 'connecte', 'smart', 'automatisation', 'eclairage'] },
  incendie: { label: 'Sécurité incendie', short: 'Incendie', icon: 'flame', chip: 'bg-orange-50 text-orange-700 ring-orange-600/20', accent: 'bg-orange-500', keywords: ['incendie', 'fire', 'extincteur', 'desenfumage', 'detection incendie', 'ssi'] },
  reseau: { label: 'Réseaux et informatique', short: 'Réseau', icon: 'network', chip: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20', accent: 'bg-cyan-500', keywords: ['reseau', 'wifi', 'cablage', 'informatique', 'fibre', 'serveur', 'baie'] },
  maintenance: { label: 'Maintenance', short: 'Maintenance', icon: 'wrench', chip: 'bg-amber-50 text-amber-700 ring-amber-600/20', accent: 'bg-amber-500', keywords: ['maintenance', 'entretien', 'depannage', 'sav'] },
  autre: { label: 'Projet', short: 'Projet', icon: 'folder', chip: 'bg-stone-100 text-stone-600 ring-stone-500/20', accent: 'bg-stone-400', keywords: [] },
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/** Domaine d'un projet à partir de son type de service (texte libre) puis de son nom. */
export function detectDomain(...texts: Array<string | undefined | null>): ItvDomain {
  const first = String(texts[0] || '').trim()
  if (first in ITV_DOMAINS) return first as ItvDomain
  const hay = normalize(texts.filter(Boolean).join(' '))
  if (!hay) return 'autre'
  for (const [key, def] of Object.entries(ITV_DOMAINS) as Array<[ItvDomain, typeof ITV_DOMAINS[ItvDomain]]>) {
    if (key === 'autre') continue
    if (hay.includes(key.replace('_', ' ')) || def.keywords.some(k => hay.includes(k))) return key
  }
  return 'autre'
}

/** Étapes d'un projet telles que présentées au client. */
export const PROJECT_STAGES = [
  { key: 'etude', label: 'Étude', hint: 'Visite, besoins, devis' },
  { key: 'validation', label: 'Validation', hint: 'Accord et commande' },
  { key: 'preparation', label: 'Préparation', hint: 'Matériel et planning' },
  { key: 'installation', label: 'Installation', hint: 'Travaux sur site' },
  { key: 'reception', label: 'Réception', hint: 'Tests et mise en service' },
  { key: 'suivi', label: 'Suivi', hint: 'Garantie et maintenance' },
] as const

export type ProjectStageKey = (typeof PROJECT_STAGES)[number]['key']

/**
 * Étape courante à partir du statut (valeurs UI et valeurs stockées : pending, in_progress, completed, cancelled)
 * et de l'avancement. paused = projet suspendu ou annulé.
 */
export function projectStage(p: { status?: string; progress?: number; quote?: { status?: string } | null; reception?: { signedAt?: unknown; decision?: string; reservesLiftedAt?: unknown } | null }) {
  const status = String(p.status || '').toLowerCase()
  const progress = Number(p.progress) || 0
  const paused = status === 'on_hold' || status === 'cancelled'
  const received = !!p.reception?.signedAt && (p.reception.decision === 'accepted' || !!p.reception.reservesLiftedAt)
  let index: number
  switch (received ? 'maintenance' : status) {
    case 'lead': case 'quoted': index = 0; break
    case 'negotiation': index = 1; break
    case 'approved': index = 2; break
    case 'in_progress': index = progress < 10 ? 2 : progress >= 90 ? 4 : 3; break
    case 'testing': index = 4; break
    case 'completed': index = 4; break
    case 'maintenance': index = 5; break
    case 'pending': index = p.quote?.status === 'approved' ? 2 : p.quote?.status === 'sent' ? 1 : 0; break
    default: index = 0
  }
  const done = received || status === 'completed' || status === 'maintenance'
  return { index, key: PROJECT_STAGES[index].key, label: PROJECT_STAGES[index].label, done, paused }
}

/** Projets visibles par le client : partagés explicitement, ou sortis de la phase commerciale interne. */
export const CLIENT_VISIBLE_PROJECT = {
  $or: [
    { clientAccess: true },
    { status: { $nin: ['lead', 'pending', 'quoted', 'negotiation', 'cancelled'] } },
  ],
}

/** Combine le périmètre entreprise (souvent un $or) avec la règle de visibilité sans écraser l'un par l'autre. */
export function clientProjectFilter(scope: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return { $and: [scope, CLIENT_VISIBLE_PROJECT, ...(Object.keys(extra).length ? [extra] : [])] }
}
