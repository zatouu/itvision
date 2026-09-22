/**
 * Login manuel fournisseur — ouvre un navigateur VISIBLE avec le profil
 * persisté. Connectez-vous dans la fenêtre : le script détecte les cookies
 * de session et ferme proprement le contexte pour flusher le profil disque.
 * Fermer la fenêtre manuellement termine aussi le script.
 *
 * Usage :
 *   npx tsx scripts/browser-login.ts              # 1688 (défaut)
 *   npx tsx scripts/browser-login.ts aliexpress   # AliExpress
 *   npx tsx scripts/browser-login.ts alibaba      # Alibaba.com
 *
 * IMPORTANT : arrêter le worker avant (il tient le lock du profil) :
 *   npx tsx scripts/agent-worker.ts stop → login → restart
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config() // .env en fallback
import * as fs from 'fs'
import * as path from 'path'
import { BrowserScraper } from '../src/lib/browser-scraper'

interface LoginTarget {
  startUrl: string
  /** Domaines sur lesquels les cookies d'auth peuvent être posés */
  cookieDomains: RegExp
  /** Cookie qui n'existe qu'après authentification (nom OU nom+signature valeur) */
  authCookies: RegExp
  /** Signature de valeur exigée (ex: 'sign=y' dans xman_us_t) — optionnel */
  authValueHint?: RegExp
  /** URL de saut SSO à visiter pour propager la session au domaine cible */
  ssoJump?: string
  targetDomain: string
}

// NB : _m_h5_tk / cna / xman_t sont posés même aux visiteurs anonymes —
// ne pas les utiliser comme preuve de login.
const TARGETS: Record<string, LoginTarget> = {
  '1688': {
    startUrl: 'https://www.1688.com',
    cookieDomains: /\.(1688|taobao|alibaba|tmall)\.com$/i,
    // cookie2/_tb_token_/sgcookie n'existent qu'après vraie authentification
    authCookies: /^(cookie2|_tb_token_|sgcookie|unb|lgc|csg)$/i,
    targetDomain: '1688.com',
    // Saut SSO Taobao→1688 (pose cookie2 & co sur .1688.com)
    ssoJump: 'https://login.1688.com/member/jump.htm?target=https%3A%2F%2Fi.1688.com%2F',
  },
  aliexpress: {
    startUrl: 'https://www.aliexpress.com/',
    cookieDomains: /\.(aliexpress|alibaba)\.com$/i,
    // xman_us_t existe post-login seulement ; valeur sign=y = session active
    authCookies: /^(xman_us_t|acs_usuc_t|xman_f)$/i,
    authValueHint: /sign=y/i,
    targetDomain: 'aliexpress.com',
  },
  alibaba: {
    startUrl: 'https://www.alibaba.com/',
    cookieDomains: /\.(alibaba|aliexpress)\.com$/i,
    // Alibaba partage le SSO du groupe : xman_us_t ou les cookies cna+lastbase
    authCookies: /^(xman_us_t|acs_usuc_t|cna)\b/i,
    authValueHint: /sign=y/i,
    targetDomain: 'alibaba.com',
  },
}

async function main() {
  const platform = (process.argv[2] || '1688').toLowerCase()
  const target = TARGETS[platform]
  if (!target) {
    console.error(`Plateforme inconnue « ${platform} » — attendu : ${Object.keys(TARGETS).join(' | ')}`)
    process.exit(1)
  }

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
      console.error('(ou : npx tsx scripts/agent-worker.ts stop)')
      process.exit(1)
    }
  }

  const scraper = new BrowserScraper({ headless: false, profileDir })
  await scraper.init()

  const page = await scraper.openSession(target.startUrl)
  console.log(`Navigateur ouvert sur ${platform} — connectez-vous (la fenêtre se fermera seule une fois la session détectée).`)

  const ctx = (scraper as unknown as { persistentContext?: { cookies(): Promise<{ name: string; domain: string; value: string }[]>; on(ev: string, fn: () => void): void } }).persistentContext
  if (!ctx) {
    console.error('Contexte persistant indisponible')
    process.exit(1)
  }

  let done = false
  ctx.on('close', () => { done = true }) // fenêtre fermée par l'utilisateur

  const findAuth = async () =>
    (await ctx.cookies().catch(() => [])).filter((c) =>
      target.cookieDomains.test(c.domain) &&
      target.authCookies.test(c.name) &&
      (!target.authValueHint || target.authValueHint.test(c.value))
    )

  const deadline = Date.now() + 10 * 60 * 1000
  while (!done && Date.now() < deadline) {
    await page.waitForTimeout(3000).catch(() => { done = true })
    const hits = await findAuth()
    const onTarget = hits.filter((c) => c.domain.endsWith(target.targetDomain))
    if (onTarget.length) {
      console.log(`Session ${platform} complète (${onTarget.map((c) => c.name).join(', ')}) — sauvegarde du profil…`)
      await page.waitForTimeout(5000).catch(() => {})
      break
    }
    if (hits.length && target.ssoJump) {
      // Login détecté sur un domaine du groupe mais pas encore propagé :
      // forcer le saut SSO vers le domaine cible.
      console.log(`Login ${hits[0].domain} détecté — propagation SSO vers ${target.targetDomain}…`)
      await page.goto(target.ssoJump, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
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
