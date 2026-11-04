/** Événements Xeuy pouvant être relayés sur WhatsApp (partagé admin / serveur, sans dépendance). */
export const WHATSAPP_RELAY_EVENTS = [
  { key: 'newRequest', label: 'Nouvelle demande proche (prestataire)', types: ['request:new'] },
  { key: 'offerReceived', label: 'Offre reçue (client)', types: ['offer:new'] },
  { key: 'offerAccepted', label: 'Offre acceptée (prestataire)', types: ['offer:accepted'] },
  { key: 'counterOffer', label: 'Contre-offre et réponse', types: ['offer:counter', 'offer:counter-accepted', 'offer:counter-rejected'] },
  { key: 'validationReminder', label: 'Relance de validation (client)', types: ['mission:validation-reminder'] },
  { key: 'stockReminder', label: 'Rappel de stock (prestataire)', types: ['stock:low'] },
] as const

export type WhatsAppRelayEventKey = typeof WHATSAPP_RELAY_EVENTS[number]['key']

export function relayEventForType(type: string | undefined): WhatsAppRelayEventKey | null {
  if (!type) return null
  const ev = WHATSAPP_RELAY_EVENTS.find(e => (e.types as readonly string[]).includes(type))
  return ev ? ev.key : null
}
