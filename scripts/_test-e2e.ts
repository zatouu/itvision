import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { search1688ViaEngines } from '../src/lib/browser-scraper'
import { scrapeOne1688 } from '../src/lib/agents/sourcing/graph'

async function main() {
  const urls = await search1688ViaEngines('蓝牙耳机', 5)
  console.log(`moteurs → ${urls.length} URLs`)
  for (const u of urls.slice(0, 3)) {
    const t0 = Date.now()
    const r = await scrapeOne1688(u)
    const s = ((Date.now() - t0) / 1000).toFixed(0)
    if (r.success && r.data) {
      console.log(`✓ ${s}s  ${r.data.name?.slice(0, 60)}  ¥${r.data.price1688}  imgs:${r.data.images?.length}`)
    } else {
      console.log(`✗ ${s}s  ${u.slice(0, 60)}  ${r.error?.slice(0, 80)}`)
    }
  }
  process.exit(0)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
