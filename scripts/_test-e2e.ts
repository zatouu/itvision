import dotenv from 'dotenv'
dotenv.config({ path: '.env.worker' })
dotenv.config({ path: '.env.local' })
dotenv.config()
import { search1688ViaEngines, searchAliExpressViaEngines, searchAlibabaViaEngines } from '../src/lib/browser-scraper'
import { scrapeOneSource } from '../src/lib/agents/sourcing/graph'

async function main() {
  const query = process.argv[2] || 'bluetooth earphones'
  const [urls1688, aeUrls, alibabaUrls] = await Promise.all([
    search1688ViaEngines(query, 4),
    searchAliExpressViaEngines(query, 4),
    searchAlibabaViaEngines(query, 4),
  ])
  const urls = [...urls1688.slice(0, 2), ...aeUrls.slice(0, 2), ...alibabaUrls.slice(0, 2)]
  console.log(`moteurs → 1688:${urls1688.length} AE:${aeUrls.length} alibaba:${alibabaUrls.length}`)
  for (const u of urls) {
    const t0 = Date.now()
    const r = await scrapeOneSource(u)
    const s = ((Date.now() - t0) / 1000).toFixed(0)
    if (r.success && r.data) {
      console.log(`✓ ${s}s  [${r.data.platform || '1688'}] ${r.data.name?.slice(0, 60)}  ${r.data.price1688} ${r.data.price1688Currency}  imgs:${r.data.gallery?.length}`)
    } else {
      console.log(`✗ ${s}s  ${u.slice(0, 60)}  ${r.error?.slice(0, 80)}`)
    }
  }
  process.exit(0)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
