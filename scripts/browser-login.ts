/**
 * Login manuel 1688 — ouvre un navigateur VISIBLE avec le profil persisté.
 * Connectez-vous à 1688 dans la fenêtre, puis revenez ici et pressez Entrée.
 * La session est sauvegardée dans SCRAPER_PROFILE_DIR → les scans headless
 * suivants héritent du login (murs de login franchis automatiquement).
 *
 * Usage : npx tsx scripts/browser-login.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config() // .env en fallback
import * as readline from 'readline'
import { BrowserScraper } from '../src/lib/browser-scraper'

async function main() {
  const scraper = new BrowserScraper({
    headless: false,
    profileDir: process.env.SCRAPER_PROFILE_DIR || 'data/browser-profile',
  })
  await scraper.init()

  // Ouvre 1688 dans le profil persisté pour que l'utilisateur se connecte
  await scraper.openSession('https://www.1688.com')

  console.log('Navigateur ouvert sur 1688 — connectez-vous, puis Entrée ici pour fermer.')
  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question('Entrée quand la connexion est faite : ', () => { rl.close(); resolve() })
  })

  await scraper.close()
  console.log('Session persistée — les prochains scans réutiliseront ce profil.')
}

main().catch((e) => {
  console.error('Échec:', e)
  process.exit(1)
})
