import { toChineseQuery } from '../src/lib/agents/sourcing/query-translate'

async function main() {
  for (const q of [
    'écouteurs bluetooth sans fil A9 Pro',
    'montre connectée femme',
    '蓝牙耳机',
    'sac à main cuir femme pas cher',
    'panneau solaire 200W',
  ]) {
    console.log(JSON.stringify(q), '→', JSON.stringify(await toChineseQuery(q)))
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
