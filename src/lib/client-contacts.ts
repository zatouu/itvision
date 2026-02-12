import Contact from '@/lib/models/Contact'
import Client from '@/lib/models/Client'
import { connectMongoose } from '@/lib/mongoose'

/**
 * Récupère tous les emails de contacts d'un client (email principal + contacts supplémentaires).
 * Retourne un tableau d'emails uniques, dédupliqués et normalisés.
 */
export async function getClientContactEmails(clientId: string): Promise<string[]> {
  await connectMongoose()

  const emails = new Set<string>()

  // 1. Email principal du client
  const client = await Client.findById(clientId).select('email').lean() as any
  if (client?.email) {
    emails.add(String(client.email).toLowerCase().trim())
  }

  // 2. Emails des contacts supplémentaires
  const contacts = await Contact.find({ clientId }).select('email').lean() as any[]
  for (const contact of contacts) {
    if (contact?.email) {
      const email = String(contact.email).toLowerCase().trim()
      if (email && email.includes('@')) {
        emails.add(email)
      }
    }
  }

  return Array.from(emails)
}

/**
 * Récupère les emails contacts formatés pour un envoi (séparés par virgule).
 * Retourne l'email principal si aucun contact n'est trouvé.
 */
export async function getClientEmailRecipients(clientId: string, fallbackEmail?: string): Promise<string> {
  const emails = await getClientContactEmails(clientId)
  if (emails.length > 0) return emails.join(', ')
  return fallbackEmail || ''
}
