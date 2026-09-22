import {
  searchAliExpressNative, searchAlibabaNative,
  searchAliExpressViaEngines, searchAlibabaViaEngines, search1688ViaEngines,
  classifySourceUrl,
} from '../src/lib/browser-scraper'
import { toChineseQuery } from '../src/lib/agents/sourcing/query-translate'

async function main() {
  const query = process.argv[2] || 'écouteurs bluetooth a9pro'
  console.log(`query: « ${query} » → zh: « ${await toChineseQuery(query)} »`)
  const [aeN, alN, aeE, alE, t] = await Promise.all([
    searchAliExpressNative(query, 5),
    searchAlibabaNative(query, 5),
    searchAliExpressViaEngines(query, 5),
    searchAlibabaViaEngines(query, 5),
    search1688ViaEngines('蓝牙耳机', 5),
  ])
  const show = (label: string, urls: string[]) => {
    console.log(`\n${label} (${urls.length}):`)
    urls.slice(0, 3).forEach(u => console.log('  ', classifySourceUrl(u) ?? '??', '←', u.slice(0, 100)))
  }
  show('1688 moteurs', t)
  show('AliExpress natif', aeN)
  show('AliExpress moteurs', aeE)
  show('Alibaba natif', alN)
  show('Alibaba moteurs', alE)
  process.exit(0)
}
main().catch(e => { console.error('ERR', e); process.exit(1) })
