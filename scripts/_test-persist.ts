import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { BrowserScraper } from '../src/lib/browser-scraper'

async function main() {
  const dir = process.env.SCRAPER_PROFILE_DIR || 'data/browser-profile'
  // Phase 1 : poser un cookie puis fermer proprement
  const s1 = new BrowserScraper({ headless: true, profileDir: dir })
  await s1.init()
  const ctx1 = (s1 as any).persistentContext
  await ctx1.addCookies([{
    name: 'persist_test', value: 'ok123', domain: '.1688.com', path: '/',
    expires: Math.floor(Date.now() / 1000) + 86400,
  }])
  console.log('cookie posé, attente 45s (commit Chromium)…')
  await new Promise((r) => setTimeout(r, 45000))
  await s1.close()
  console.log('phase1 fermée')
  // Phase 2 : relancer et relire
  const s2 = new BrowserScraper({ headless: true, profileDir: dir })
  await s2.init()
  const ctx2 = (s2 as any).persistentContext
  const found = (await ctx2.cookies()).filter((c: any) => c.name === 'persist_test')
  console.log(found.length ? '✅ PERSISTANCE OK' : '❌ COOKIE PERDU')
  await s2.close()
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
