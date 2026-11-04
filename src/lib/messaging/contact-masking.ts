/**
 * Masquage des coordonnées échangées dans les messages (anti-contournement de la plateforme :
 * sans paiement sécurisé, client et prestataire ne sont plus protégés par l'escrow).
 */

// Numéros sénégalais (+221 / 00221 / 7x...) et suites de 8 chiffres ou plus, séparateurs tolérés
const PHONE_PATTERN = /(?:(?:\+|00)\s?\d{1,3}[\s.-]?)?(?:\d[\s.-]?){8,}\d/g
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const MESSAGING_LINK_PATTERN = /\b(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|m\.me)\/\S+/gi

const MASK = '[coordonnées masquées]'

export function contactMaskingEnabled() {
  return process.env.CHAT_MASK_CONTACTS === 'true'
}

export function maskContactInfo(text: string): { text: string; masked: boolean } {
  const result = text
    .replace(MESSAGING_LINK_PATTERN, MASK)
    .replace(EMAIL_PATTERN, MASK)
    .replace(PHONE_PATTERN, MASK)
  return { text: result, masked: result !== text }
}
