#!/usr/bin/env node
/**
 * Test rapide scraping 1688 - Mode headless (plus rapide)
 */

import { BrowserScraper } from '../src/lib/browser-scraper'

const url = process.argv[2] || 'https://detail.1688.com/offer/1005853377643.html'

async function test() {
  console.log('🧪 Test scraping (headless mode):', url)
  console.log('')

  const scraper = new BrowserScraper({ headless: true }) // headless = rapide
  
  try {
    await scraper.init()
    console.log('✅ Navigateur prêt')
    
    const result = await scraper.scrape1688(url)
    
    console.log('\n═══════════════════════════════════════')
    if (result.success) {
      console.log('✅ SUCCÈS')
      console.log(`\nTitre: ${result.data?.name}`)
      console.log(`Prix: ${result.data?.price1688} CNY`)
      console.log(`Images: ${result.data?.gallery?.length || 0}`)
      console.log(`Fournisseur: ${result.data?.supplier?.name || 'N/A'}`)
      console.log(`\nDurée: ${result.durationMs}ms`)
    } else {
      console.log('❌ ÉCHEC:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await scraper.close()
  }
}

test()
