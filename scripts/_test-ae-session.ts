import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { searchAliExpressNative } from '../src/lib/browser-scraper'
import { scrapeOneSource } from '../src/lib/agents/sourcing/graph'

async function main() {
  const urls = await searchAliExpressNative('bluetooth earphones ANC')
  console.log('native AE:', urls.length, urls.slice(0, 3))
  if (!urls.length) return console.log('aucune URL')
  const r = await scrapeOneSource(urls[0])
  console.log('success:', r.success, '| error:', r.error || '-', `(${r.durationMs}ms)`)
  const p = r.data
  if (!p) return
  console.log(`[${p.platform}] ${p.name.slice(0, 70)}`)
  console.log(`prix: ${p.price1688} ${p.price1688Currency} × ${p.exchangeRate} → ${Math.round((p.price1688 || 0) * p.exchangeRate)} FCFA | imgs: ${p.gallery.length}`)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
