import { BrowserScraper } from '../src/lib/browser-scraper'

async function main() {
  const url = process.argv[2]
  const wait = Number(process.argv[3] || 6000)
  if (!url) { console.log('usage: tsx _test-diag-intl.ts <url> [waitMs]'); process.exit(1) }
  const s = new BrowserScraper({ headless: true, profileDir: process.env.SCRAPER_PROFILE_DIR })
  await s.init()
  // @ts-expect-error accès interne pour diag
  const ctx = await s.createContext()
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('goto:', e.message))
  // Attente + scroll pour déclencher le rendu lazy / le challenge JS
  const t0 = Date.now()
  while (Date.now() - t0 < wait) {
    await page.mouse.wheel(0, 800).catch(() => {})
    await page.waitForTimeout(1500)
    const has = await page.evaluate(() => !!document.querySelector('[data-pl="product-title"], h1'))
    if (has) break
  }
  console.log('URL finale:', page.url())
  console.log('title:', await page.title())
  const h1 = await page.evaluate(() => document.querySelector('[data-pl="product-title"], h1')?.textContent?.trim() || 'ABSENT')
  console.log('h1:', h1)
  const prices = await page.evaluate(() => {
    const t = document.body?.innerText || ''
    return [...t.matchAll(/[^\n]{0,40}(?:US\$|\$|USD|€|¥|MAD|CFA|FCFA|Dh|Dhs|د\.م)\s*[\d.,]+[^\n]{0,30}/g)].map(m => m[0].trim()).slice(0, 12)
  })
  console.log('--- occurrences prix ---'); prices.forEach(p => console.log(' ', p))
  await s.close()
  process.exit(0)
}
main().catch(e => { console.error('ERR:', e.message); process.exit(1) })
