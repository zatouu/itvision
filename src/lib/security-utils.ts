/**
 * Utilitaires de sécurité pour l'application
 */

/**
 * Échappe les caractères spéciaux d'une chaîne pour l'utiliser en toute sécurité dans une RegExp
 * Prévient les attaques ReDoS (Regular Expression Denial of Service)
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Crée une RegExp sécurisée pour la recherche (insensible à la casse)
 */
export function safeSearchRegex(search: string): RegExp {
  return new RegExp(escapeRegex(search), 'i')
}

/**
 * Valide et nettoie un ID MongoDB pour éviter les injections
 */
export function sanitizeMongoId(id: string): string | null {
  if (!id || typeof id !== 'string') return null
  // Un ObjectId MongoDB valide est une chaîne de 24 caractères hexadécimaux
  const cleanId = id.trim()
  if (/^[a-fA-F0-9]{24}$/.test(cleanId)) {
    return cleanId
  }
  return null
}

/**
 * Nettoie une chaîne pour éviter les injections XSS basiques
 */
export function sanitizeString(str: string, maxLength = 1000): string {
  if (!str || typeof str !== 'string') return ''
  return str
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Supprimer les balises HTML basiques
    .trim()
}

/**
 * Valide un email
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Valide un numéro de téléphone (format international flexible)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false
  // Accepte les formats: +221 77 123 4567, 77 123 4567, +33612345678
  const phoneRegex = /^\+?[\d\s-]{8,20}$/
  return phoneRegex.test(phone.trim())
}

/**
 * Limite la taille d'un tableau pour éviter les attaques par surcharge
 */
export function limitArraySize<T>(arr: T[], maxSize = 100): T[] {
  if (!Array.isArray(arr)) return []
  return arr.slice(0, maxSize)
}

/**
 * Vérifie si une valeur est un nombre valide dans une plage
 */
export function isValidNumber(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): boolean {
  const num = Number(value)
  return !isNaN(num) && num >= min && num <= max
}
