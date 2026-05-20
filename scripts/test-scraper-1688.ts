#!/usr/bin/env node
/**
 * Test rapide du scraping 1688/AliExpress
 * Usage: npx tsx scripts/test-scraper-1688.ts <url>
 */

import { BrowserScraper } from '../src/lib/browser-scraper'

const url = process.argv[2]

if (!url) {
  console.log('Usage: npx tsx scripts/test-scraper-1688.ts <url>')
  console.log('Exemples:')
  console.log('  npx tsx scripts/test-scraper-1688.ts https://detail.1688.com/offer/6928374657182904819.html')
  console.log('  npx tsx scripts/test-scraper-1688.ts https://www.aliexpress.com/item/1005004938271654.html')
  process.exit(1)
}

async function test() {
  console.log('🧪 Test scraping:', url)
  console.log('')

  const scraper = new BrowserScraper({ headless: false }) // headless:false pour voir le navigateur
  
  try {
    await scraper.init()
    
    let result
    if (url.includes('1688.com')) {
      result = await scraper.scrape1688(url)
    } else if (url.includes('aliexpress.com')) {
      result = await scraper.scrapeAliExpress(url)
    } else {
      console.error('❌ URL non supportée (1688 ou AliExpress uniquement)')
      process.exit(1)
    }

    console.log('Résultat:')
    console.log(JSON.stringify(result, null, 2))
    
    if (result.success) {
      console.log('\n✅ SUCCÈS')
    } else {
      console.log('\n❌ ÉCHEC:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await scraper.close()
  }
}

test()
