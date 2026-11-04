import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { BrowserScraper } from '../src/lib/browser-scraper'

async function main() {
  const s = new BrowserScraper({ headless: true, profileDir: 'data/browser-profile' })
  await s.init()
  const r = await s.scrapeAliExpress('https://www.aliexpress.com/item/1005012221826257.html', 1)
  const p = r.data
  console.log('success:', r.success, '| err:', r.error || '-', `(${r.durationMs}ms)`)
  if (p) console.log(`[imgs: ${p.gallery?.length ?? '?'}] ${p.name?.slice(0, 60)} | ${p.price} ${p.priceCurrency} | img0: ${(p.gallery?.[0] || p.image || '').slice(0, 80)}`)
  await s.close()
  process.exit(0)
}
setTimeout(() => { console.log('GLOBAL TIMEOUT 150s'); process.exit(2) }, 150000)
main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
