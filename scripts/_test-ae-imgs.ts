import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { BrowserScraper } from '../src/lib/browser-scraper'

async function main() {
  const s = new BrowserScraper({ headless: true, profileDir: 'data/browser-profile' })
  await s.init()
  const page = await s.openSession('https://www.aliexpress.com/item/1005012221826257.html')
  await page.waitForTimeout(25000)
  const out = await page.evaluate(() => {
    const html = document.documentElement.innerHTML
    const keys = ['imagePathList', 'imageModule', 'imageList', '"images"', 'alicdn.com']
    const counts = Object.fromEntries(keys.map(k => [k, html.split(k).length - 1]))
    // URLs alicdn trouvées n'importe où
    const urls = [...html.matchAll(/https?:\\?\/\\?\/[^"'\s]*alicdn\.com[^"'\s]*\.(?:jpg|png|webp)[^"'\s]*/gi)].map(m => m[0].slice(0, 120))
    const domImgs = [...document.querySelectorAll('img')].map(i => (i.src || i.dataset.src || '').slice(0, 100)).filter(Boolean)
    return { counts, alicdnUrls: urls.slice(0, 8), nbAlicdn: urls.length, domImgs: domImgs.slice(0, 8), nbDom: domImgs.length, title: document.title.slice(0, 60) }
  })
  console.log(JSON.stringify(out, null, 1))
  await s.close()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
