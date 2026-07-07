/**
 * Configuration centralisée du branding.
 *
 * Marketplace (DDM) et Corporate (IT Vision Plus) ont des identités distinctes.
 * Les clients marketplace ne doivent pas voir le nom "IT Vision Plus".
 *
 * Les emails et domaines restent inchangés tant que les équivalents DDM
 * ne sont pas créés (mails, nom de domaine).
 */

export const MARKET_BRAND = {
  name: 'DDM+',
  fullName: 'Dieund Dal Ma',
  tagline: 'Marketplace import',
  subtitle: 'Import & sourcing',
  description: 'Marketplace import Chine & Sécurité Électronique',
  // Emails conservés tels quels (pas d'email DDM dédié pour l'instant)
  contactEmail: 'contact@itvisionplus.sn',
  supportEmail: 'support@itvisionplus.sn',
  // Domaine conservé tel quel (pas de domaine DDM dédié pour l'instant)
  url: 'https://market.itvisionplus.sn',
  whatsapp: '+221 77 413 34 40',
  address: 'Parcelles Assainies, Unité 25 – Dakar, Sénégal',
  hashtag: '#DDM',
} as const

export const CORPORATE_BRAND = {
  name: 'IT Vision Plus',
  tagline: 'Sécurité électronique & digitalisation',
  contactEmail: 'contact@itvisionplus.sn',
  supportEmail: 'support@itvisionplus.sn',
  url: 'https://itvisionplus.sn',
  whatsapp: '+221 77 413 34 40',
  address: 'Parcelles Assainies, Unité 25 – Dakar, Sénégal',
} as const
