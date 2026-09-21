/**
 * Login manuel 1688 — ouvre un navigateur VISIBLE avec le profil persisté.
 * Connectez-vous à 1688 dans la fenêtre : le script détecte les cookies de
 * session (cookie2/_tb_token_/sgc… sur .1688.com/.taobao.com) et ferme
 * proprement le contexte pour flusher le profil sur disque.
 * Fermer la fenêtre manuellement termine aussi le script.
 *
 * Usage : npx tsx scripts/browser-login.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config() // .env en fallback
import * as fs from 'fs'
import * as path from 'path'
import { BrowserScraper } from '../src/lib/browser-scraper'

// Marqueurs d'une session Alibaba/1688 authentifiée.
// NB : _m_h5_tk / cna sont posés même aux visiteurs anonymes — ne pas les
// utiliser comme preuve de login. cookie2/_tb_token_/sgcookie n'existent
// qu'après une vraie authentification.
const LOGIN_COOKIE_NAMES = /^(cookie2|_tb_token_|sgcookie|unb|lgc|csg)$/i
const LOGIN_COOKIE_DOMAINS = /\.(1688|taobao|alibaba|tmall)\.com$/i

async function main() {
  const profileDir = process.env.SCRAPER_PROFILE_DIR || 'data/browser-profile'

  // Garde anti-zombie : si un navigateur orphelin tient encore le profil,
  // la base Cookies est lockée et la session tomberait en mode mémoire
  // (rien ne persiste). Détecter avant de lancer.
  const cookiesDb = path.join(profileDir, 'Default', 'Network', 'Cookies')
  if (fs.existsSync(cookiesDb)) {
    try {
      fs.closeSync(fs.openSync(cookiesDb, 'r+'))
    } catch {
      console.error('Le profil navigateur est verrouillé par un process zombie.')
      console.error('Tuez les process chrome/headless-shell sur ce profil puis relancez.')
      process.exit(1)
    }
  }

  const scraper = new BrowserScraper({ headless: false, profileDir })
  await scraper.init()

  const page = await scraper.openSession('https://www.1688.com')
  console.log('Navigateur ouvert sur 1688 — connectez-vous (la fenêtre se fermera seule une fois la session détectée).')

  const ctx = (scraper as unknown as { persistentContext?: { cookies(): Promise<{ name: string; domain: string }[]>; on(ev: string, fn: () => void): void } }).persistentContext
  if (!ctx) {
    console.error('Contexte persistant indisponible')
    process.exit(1)
  }

  let done = false
  ctx.on('close', () => { done = true }) // fenêtre fermée par l'utilisateur

  const hasAuth = async () =>
    (await ctx.cookies().catch(() => []))
      .filter((c) => LOGIN_COOKIE_DOMAINS.test(c.domain) && LOGIN_COOKIE_NAMES.test(c.name))

  const deadline = Date.now() + 10 * 60 * 1000
  while (!done && Date.now() < deadline) {
    await page.waitForTimeout(3000).catch(() => { done = true })
    const hits = await hasAuth()
    const on1688 = hits.filter((c) => c.domain.endsWith('1688.com'))
    if (on1688.length) {
      console.log(`Session 1688 complète (${on1688.map((c) => c.name).join(', ')}) — sauvegarde du profil…`)
      await page.waitForTimeout(5000).catch(() => {})
      break
    }
    if (hits.length) {
      // Login Taobao détecté mais pas encore propagé à 1688 : forcer le saut SSO
      // qui pose cookie2 & co sur .1688.com — sinon s.1688.com reste muré.
      console.log(`Login ${hits[0].domain} détecté — propagation SSO vers 1688…`)
      await page.goto('https://login.1688.com/member/jump.htm?target=https%3A%2F%2Fi.1688.com%2F', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
      await page.waitForTimeout(6000).catch(() => {})
    }
  }

  await scraper.close().catch(() => {})
  console.log(done && Date.now() >= deadline ? 'Timeout sans login détecté.' : 'Session persistée — les scans réutiliseront ce profil.')
}

main().catch((e) => {
  console.error('Échec:', e)
  process.exit(1)
})
