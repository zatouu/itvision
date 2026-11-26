/**
 * Scraping 1688 avec profil navigateur persistant (session réutilisable).
 * Plain JS (pas tsx) — tourne sous Windows : node scripts/scrape-1688-session.js <commande>
 *
 * Commandes :
 *   login                  ouvre Chrome visible sur 1688 — connecte-toi, puis ferme la fenêtre.
 *                          La session reste dans .scrape-profile/ pour les prochains runs.
 *   scrape <urls.txt> [out.json] [--headed]
 *                          scrape chaque URL avec la session du profil, résultats JSON.
 *
 * Le profil .scrape-profile ne doit JAMAIS être commité (cookies de session).
 */
const fs = require('fs');
const path = require('path');
let chromium;
try {
  chromium = require('playwright-extra').chromium;
  chromium.use(require('puppeteer-extra-plugin-stealth')());
} catch { chromium = require('playwright').chromium; }

const PROFILE = path.join(__dirname, '..', '.scrape-profile');
const CONTENT_JS = path.join(__dirname, '..', 'extension', 'content.js');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function openContext(headless) {
  return chromium.launchPersistentContext(PROFILE, {
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    channel: fs.existsSync(CHROME) ? undefined : 'chrome',
    headless,
    chromiumSandbox: true,
    viewport: { width: 1366, height: 900 },
    locale: 'zh-CN',
    ignoreDefaultArgs: ['--enable-automation', '--disable-blink-features=AutomationControlled'],
  });
}

async function login() {
  const ctx = await openContext(false);
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://www.1688.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('>>> Connecte-toi sur 1688 dans la fenêtre Chrome (scan QR ou mot de passe).');
  console.log('>>> Quand tu es connecté, reviens ici et appuie sur Entrée — ou ferme simplement la fenêtre.');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
    ctx.on('close', resolve);
  });
  // test rapide de session
  try {
    await page.goto('https://detail.1688.com/offer/729232875543.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
    const title = await page.title();
    console.log('Test page produit — titre :', title.slice(0, 80));
    console.log(title.includes('全球领先') ? '⚠ session NON reconnue (redirigé)' : '✓ session OK — la page produit se charge');
  } catch (e) { console.log('test impossible :', e.message.slice(0, 120)); }
  await ctx.close();
}

async function scrape(file, out, headed) {
  const urls = fs.readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => /^https?:/.test(l));
  console.log(`scrape: ${urls.length} URLs (${headed ? 'headed' : 'headless'})`);
  const ctx = await openContext(!headed);
  const results = [];
  for (const url of urls) {
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3500);
      await page.addScriptTag({ path: CONTENT_JS });
      const data = await page.evaluate(() => window.itVisionScrape ? window.itVisionScrape() : null);
      const title = await page.title();
      if (data && data.name) {
        results.push({ url, ok: true, data });
        console.log('✓', data.name.slice(0, 60), '|', (data.images || []).length, 'img');
      } else {
        results.push({ url, ok: false, error: 'extraction vide', title });
        console.log('✗ extraction vide —', title.slice(0, 50));
      }
    } catch (e) {
      results.push({ url, ok: false, error: e.message.slice(0, 200) });
      console.log('✗', e.message.slice(0, 100));
    }
    await page.close();
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500)); // cadence humaine
  }
  await ctx.close();
  const outFile = out || `scrape-1688-${Date.now()}.json`;
  fs.writeFileSync(outFile, JSON.stringify({ exportedAt: new Date().toISOString(), count: results.filter(r => r.ok).length, results }, null, 1));
  console.log(`\n${results.filter(r => r.ok).length}/${urls.length} OK → ${outFile}`);
}

(async () => {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'login') await login();
  else if (cmd === 'scrape' && rest[0]) await scrape(rest[0], rest[1], rest.includes('--headed'));
  else console.log('usage: node scripts/scrape-1688-session.js login | scrape <urls.txt> [out.json] [--headed]');
})().catch(e => { console.error('fatal:', e.message); process.exit(1); });
