import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { BrowserScraper } from '../src/lib/browser-scraper'

async function main() {
  const scraper = new BrowserScraper({
    headless: true,
    profileDir: process.env.SCRAPER_PROFILE_DIR || 'data/browser-profile',
  })
  await scraper.init()
  const ctx = (scraper as unknown as { persistentContext?: { cookies(): Promise<{ name: string; domain: string; expires: number }[]> } }).persistentContext
  const cookies = await ctx!.cookies()
  const interesting = cookies.filter((c) => /1688|taobao|alibaba|tmall/i.test(c.domain))
  console.log(`Total cookies: ${cookies.length}, dont Alibaba: ${interesting.length}`)
  for (const c of interesting) {
    console.log(`  ${c.domain}  ${c.name}  exp:${c.expires > 0 ? new Date(c.expires * 1000).toISOString().slice(0, 10) : 'session'}`)
  }
  await scraper.close()
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
