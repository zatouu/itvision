/**
 * Diagnostic de la recherche « Trouvez-moi », sans base de données ni file d'attente :
 * même découverte + extraction que l'agent, une fiche testée par plateforme.
 *
 * Usage : npm run test:sourcing-search -- "écouteurs bluetooth a9pro"
 * À lancer sur la machine qui héberge le worker (même IP, même proxy).
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { classifySourceUrl } from '../src/lib/browser-scraper'
import { toChineseQuery, toEnglishQuery } from '../src/lib/agents/sourcing/query-translate'
import { discoverSourceUrls, scrapeOneSource, isQualityProduct, closeSourcingBrowser } from '../src/lib/agents/sourcing/graph'

const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RED = '\x1b[31m', CYAN = '\x1b[36m', RESET = '\x1b[0m'

async function main() {
  const query = process.argv.slice(2).join(' ').trim() || 'écouteurs bluetooth a9pro'
  console.log(`${CYAN}Requête${RESET} « ${query} »`)
  console.log(`  chinois : « ${await toChineseQuery(query)} »`)
  console.log(`  anglais : « ${await toEnglishQuery(query)} »`)
  console.log(`  proxy   : ${process.env.SCRAPER_PROXY ? 'oui' : 'non (IP du serveur)'}\n`)

  const t0 = Date.now()
  const { urls, blockedReason } = await discoverSourceUrls(query, 12)
  console.log(`${CYAN}Découverte${RESET} ${urls.length} fiche(s) en ${Math.round((Date.now() - t0) / 1000)} s${blockedReason ? ` ${YELLOW}(blocage : ${blockedReason})${RESET}` : ''}`)

  const byPlatform = new Map<string, string[]>()
  for (const u of urls) {
    const p = classifySourceUrl(u) || '?'
    byPlatform.set(p, [...(byPlatform.get(p) || []), u])
  }

  let ok = 0
  for (const platform of ['1688', 'aliexpress', 'alibaba']) {
    const list = byPlatform.get(platform) || []
    if (!list.length) {
      console.log(`  ${RED}✗ ${platform}${RESET} aucune fiche trouvée`)
      continue
    }
    const t1 = Date.now()
    const res = await scrapeOneSource(list[0])
    const q = isQualityProduct(res.data)
    const secs = Math.round((Date.now() - t1) / 1000)
    if (res.success && q.ok) {
      ok++
      console.log(`  ${GREEN}✓ ${platform}${RESET} ${list.length} fiche(s) · « ${(q.cleanedName || res.data?.name || '').slice(0, 60)} » · ${res.data?.price1688 ?? '?'} ${res.data?.price1688Currency || ''} (${secs} s)`)
    } else {
      const why = res.success ? `fiche incomplète (nom ${q.nameOk ? 'ok' : 'absent'}, prix ${q.priceOk ? 'ok' : 'absent'})` : res.error
      console.log(`  ${YELLOW}! ${platform}${RESET} ${list.length} fiche(s) mais extraction échouée : ${why} (${secs} s)`)
    }
  }

  await closeSourcingBrowser()
  console.log(ok > 0
    ? `\n${GREEN}Recherche opérationnelle${RESET} sur ${ok}/3 plateforme(s).`
    : `\n${RED}Aucune plateforme exploitable${RESET} depuis cette machine : vérifier Chromium, la RAM et SCRAPER_PROXY.`)
  process.exit(ok > 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error(`${RED}Erreur${RESET}`, e)
  await closeSourcingBrowser()
  process.exit(1)
})
