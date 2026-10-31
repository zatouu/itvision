async function main() {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  const res = await fetch('https://www.alibaba.com/trade/search?SearchText=bluetooth+earphones', {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(20000),
  })
  const html = await res.text()
  console.log('status:', res.status, 'len:', html.length)
  const pats = [
    /alibaba\.com\/product-detail\/([^\s"'<>&?]+?\.html)/g,
    /product-detail[^\s"'<>]{0,120}/g,
    /"productId"\s*:\s*"?\d+/g,
  ]
  for (const p of pats) {
    const m = [...html.matchAll(p)].map(x => x[0])
    console.log(`pattern ${p.source.slice(0, 50)} → ${m.length}`)
    m.slice(0, 4).forEach(x => console.log('   ', x))
  }
  if (/punish|verify|slider|captcha/i.test(html)) {
    const i = html.search(/punish|verify|slider|captcha/i)
    console.log('⚠ anti-bot?', html.slice(Math.max(0, i - 80), i + 120).replace(/\s+/g, ' '))
  }
  process.exit(0)
}
main().catch(e => { console.error('ERR', e.message); process.exit(1) })
