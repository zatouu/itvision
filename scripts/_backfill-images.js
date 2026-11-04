// Backfill images produits : télécharge les URLs distantes en local,
// produit un manifest JSON (productId → fichiers) pour scp+docker cp+update DB.
// Usage : node scripts/_backfill-images.js   (prod via .env.worker + tunnel :27019)
require('dotenv').config({ path: '.env.worker' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../tmp/img-backfill');
const MIN_BYTES = 2000; // <2KB = placeholder lazy-load
const EXT_BY_MIME = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif', 'image/svg+xml': '.svg' };

function refererFor(host) {
  if (/1688\.com$/.test(host)) return 'https://www.1688.com/';
  if (/aliexpress\.com$|aliexpress-media\.com$/.test(host)) return 'https://www.aliexpress.com/';
  if (/alibaba\.com$/.test(host)) return 'https://www.alibaba.com/';
  return `https://${host}/`;
}

async function download(url) {
  const u = new URL(url);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': refererFor(u.hostname),
      'Accept': 'image/avif,image/webp,image/png,image/*,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(20000), redirect: 'follow',
  });
  if (!res.ok) return null;
  const mime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES || ext === '.svg') return null; // placeholder
  return { buf, ext };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const products = await db.collection('products').find({
    $or: [{ image: /^https?:\/\// }, { gallery: /^https?:\/\// }],
  }).project({ name: 1, image: 1, gallery: 1 }).toArray();
  console.log(`${products.length} produits avec images distantes`);

  const manifest = [];
  for (const p of products) {
    const urls = [...new Set([p.image, ...(p.gallery || [])].filter(u => /^https?:\/\//.test(u || '')))];
    const local = [];
    for (const url of urls) {
      const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 24);
      const got = await download(url).catch(() => null);
      if (!got) { console.log(`  ✗ ${p.name.slice(0, 40)} ← ${url.slice(0, 80)}`); continue; }
      const fname = `${hash}${got.ext}`;
      fs.writeFileSync(path.join(OUT_DIR, fname), got.buf);
      local.push({ url, file: fname });
    }
    if (local.length) manifest.push({ id: String(p._id), name: p.name, map: local });
    console.log(`${local.length}/${urls.length} ✓ ${p.name.slice(0, 55)}`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(`\nmanifest: ${manifest.length} produits, ${manifest.reduce((n, m) => n + m.map.length, 0)} fichiers`);
  await mongoose.disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1) });
