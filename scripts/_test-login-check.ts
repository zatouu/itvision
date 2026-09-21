import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { BrowserScraper } from '../src/lib/browser-scraper'

async function main() {
  const scraper = new BrowserScraper({
    headless: process.env.HEADED !== '1',
    profileDir: process.env.SCRAPER_PROFILE_DIR || 'data/browser-profile',
  })
  await scraper.init()
  const page = await scraper.openSession('https://s.1688.com/selloffer/offer_search.htm?keywords=%E8%80%B3%E6%9C%BA')
  await page.waitForTimeout(4000)
  const url = page.url()
  const title = await page.title()
  const items = await page.$$eval('a[href*="detail.1688.com/offer/"]', (els) => els.slice(0, 5).map((e) => (e as HTMLAnchorElement).href)).catch(() => [] as string[])
  console.log('URL finale:', url)
  console.log('Titre:', title)
  console.log('Liens offres:', items.length, items.slice(0, 3))
  const loginWall = /login\.(taobao|1688)|passport/i.test(url)
  console.log(loginWall ? '❌ MUR LOGIN' : '✅ SESSION OK')
  await scraper.close()
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
