import { scrapeOneSource, closeSourcingBrowser } from '../src/lib/agents/sourcing/graph'
import { isQualityProduct } from '../src/lib/agents/sourcing/graph'

async function main() {
  const urls = process.argv.slice(2)
  if (!urls.length) {
    console.log('usage: tsx _test-extract-intl.ts <url> [url…]')
    process.exit(1)
  }
  for (const u of urls) {
    const t0 = Date.now()
    const r = await scrapeOneSource(u)
    const s = ((Date.now() - t0) / 1000).toFixed(0)
    if (r.success && r.data) {
      const q = isQualityProduct(r.data)
      console.log(`\n✓ ${s}s  [${r.data.platform}] ${r.data.name?.slice(0, 70)}`)
      console.log(`   prix: ${r.data.price1688} ${r.data.price1688Currency} (taux ${r.data.exchangeRate}) → ~${Math.round((r.data.price1688 || 0) * r.data.exchangeRate)} FCFA`)
      console.log(`   imgs:${r.data.gallery?.length} fournisseur:${r.data.supplier?.name || '—'} moq:${r.data.moq || '—'} qualité:${q.ok ? 'OK' : 'SKIP'}`)
    } else {
      console.log(`\n✗ ${s}s  ${u.slice(0, 70)}\n   ${r.error?.slice(0, 120)}`)
    }
  }
  await closeSourcingBrowser()
  process.exit(0)
}
main().catch(async (e) => { console.error('ERR:', e.message); await closeSourcingBrowser(); process.exit(1) })
