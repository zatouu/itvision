import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { BrowserScraper } from '../src/lib/browser-scraper'

async function main() {
  const scraper = new BrowserScraper({ headless: true, profileDir: 'data/browser-profile' })
  await scraper.init()
  const page = await scraper.openSession('https://detail.1688.com/offer/809061371065.html')
  await page.waitForTimeout(5000)
  console.log('URL:', page.url())
  console.log('Titre:', await page.title())
  const text = await page.evaluate(() => document.body?.innerText?.slice(0, 600) || '')
  console.log('Contenu:', text.replace(/\n+/g, ' | '))
  const hasPrice = await page.evaluate(() => !!document.querySelector('[class*="price"],[class*="Price"]'))
  console.log('éléments prix présents:', hasPrice)
  await scraper.close()
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
