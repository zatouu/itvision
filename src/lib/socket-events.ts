/**
 * Registre des événements Socket.io par domaine (server.js).
 *
 * Convention cible : `<domaine>:<entité>:<action>` (ex. `corp:ticket:updated`).
 * Les événements legacy sans préfixe restent supportés tant que les clients
 * déployés (apps mobiles) les utilisent — ne pas renommer sans compat.
 * Tout NOUVEL événement doit être namespacé.
 */

export type SocketDomain = 'corp' | 'mkt' | 'xeuy' | 'shared'

/** Événements actuels classés par domaine (état existant, server.js). */
export const LEGACY_EVENTS: Record<string, SocketDomain> = {
  // ── Xeuy (mobile consumer/provider) ──
  'join-request-room': 'xeuy',
  'leave-request-room': 'xeuy',
  'join-provider-channel': 'xeuy',
  'leave-provider-channel': 'xeuy',
  'join-nearby-room': 'xeuy',
  'leave-nearby-room': 'xeuy',
  'provider:gps': 'xeuy',
  'provider:status': 'xeuy',
  'provider:location': 'xeuy',
  'get-online-providers': 'xeuy',
  'online-providers-count': 'xeuy',
  'join-mission-chat': 'xeuy',
  'leave-mission-chat': 'xeuy',
  'request:viewing': 'xeuy',
  'request:stop-viewing': 'xeuy',
  'offer:typing': 'xeuy',
  'mission:status_updated': 'xeuy',
  'mission:client_typing': 'xeuy',
  'request:status-changed': 'xeuy',
  'ai:advice_updated': 'xeuy',
  'user:offer-received': 'xeuy',
  'user:request-assigned': 'xeuy',

  // ── Corporate (portail entreprise / admin) ──
  'join-project': 'corp',
  'leave-project': 'corp',
  'project-updated': 'corp',
  'user-joined-project': 'corp',
  'join-ticket': 'corp',
  'leave-ticket': 'corp',
  'ticket-updated': 'corp',
  'typing-start': 'corp',
  'typing-stop': 'corp',
  'user-typing': 'corp',
  'send-message': 'corp',
  'new-message': 'corp',
  'update-requested': 'corp',

  // ── Partagé ──
  'heartbeat': 'shared',
  'heartbeat-ack': 'shared',
  'connected': 'shared',
  'notification': 'shared',
}

/** Préfixes de rooms par domaine (pour référence et future isolation). */
export const ROOM_PREFIXES: Record<SocketDomain, string[]> = {
  xeuy: ['request-', 'provider-', 'mission-', 'providers-online', 'nearby-providers'],
  corp: ['project-', 'ticket-'],
  mkt: [],
  shared: ['user-', 'clients', 'admins', 'technicians'],
}

/** Domaine d'un événement legacy ; null si inconnu/non déclaré. */
export function getEventDomain(event: string): SocketDomain | null {
  return LEGACY_EVENTS[event] ?? null
}
