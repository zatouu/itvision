// Publication rétroactive des brouillons vendeur passant les checks déterministes
// (réplique exacte de src/lib/agents/moderation/checks.ts + décision route.ts)
// Usage : ssh ... "docker exec -i itvision-mongodb mongosh URI --quiet" < scripts/_publish-drafts-mongosh.js
const db = db.getSiblingDB('itvision_db');
const FORBIDDEN = /\b(contrefa[çc]on|contrefait|r[ée]pli(que|ca)|fake|clone\b|drogue|cannabis|cbd|arme[s]?\b|munition|viagra|cialis|st[ée]ro[ïi]de|passeport|faux billets?)\b/i;
const esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };

const shopSlugs = new Set(db.shops.find({}, { slug: 1 }).toArray().map(s => s.slug));
const drafts = db.products.find({ isPublished: false }).toArray();

const results = drafts.map(p => {
  const isVendorProduct = !!(p.shopId || (p.sellerSlug && shopSlugs.has(p.sellerSlug)));
  const hasImage = !!(p.image || (p.gallery || []).length > 0);
  const priceAboveMin = (p.price || 0) >= 100;
  const m = ((p.name || '') + ' ' + (p.category || '')).match(FORBIDDEN);
  const normalized = (p.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const dup = p.sellerSlug
    ? db.products.findOne({ sellerSlug: p.sellerSlug, _id: { $ne: p._id }, name: { $regex: '^' + esc(normalized) + '$', $options: 'i' } }, { _id: 1 })
    : null;
  let priceVsMedian = null;
  if (p.category) {
    const prices = db.products.find({ category: p.category, isPublished: true, price: { $gt: 0 } }, { price: 1 }).sort({ price: 1 }).toArray().map(x => x.price);
    if (prices.length >= 3) {
      const med = prices[Math.floor(prices.length / 2)];
      if (med > 0 && p.price) priceVsMedian = p.price / med;
    }
  }
  let hard = null;
  if (!hasImage) hard = 'Aucune photo produit';
  else if (!priceAboveMin) hard = 'Prix inférieur au minimum (100 F)';
  else if (m) hard = 'Contenu interdit détecté : «' + m[0] + '»';
  else if (dup) hard = 'Doublon : un produit porte déjà ce nom dans cette boutique';
  const outlier = priceVsMedian != null && (priceVsMedian < 0.1 || priceVsMedian > 20);
  return {
    p, isVendorProduct,
    checks: { hasImage, priceAboveMin, forbiddenWord: m ? m[0] : null, duplicateName: !!dup, priceVsMedian, hardViolation: hard },
    publish: isVendorProduct && !hard && !outlier,
  };
});

results.forEach(r => {
  const flag = r.isVendorProduct ? 'VENDOR' : 'sourcing';
  if (r.publish) {
    db.products.updateOne({ _id: r.p._id }, { $set: { isPublished: true, updatedAt: new Date() } });
    db.agentdecisions.insertOne({
      type: 'product_moderation', refId: String(r.p._id), runId: 'backfill-' + r.p._id, status: 'auto_approved',
      proposal: {
        verdict: 'approve', confidence: 1,
        reasons: ['Checks déterministes passés — publication rétroactive (demande admin)'],
        checks: r.checks,
        product: { name: r.p.name, price: r.p.price, category: r.p.category, image: r.p.image || (r.p.gallery || [])[0], sellerName: r.p.sellerName },
      },
      decidedBy: 'system:backfill', decidedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    });
    print('PUBLIE [' + flag + '] ' + String(r.p.name).slice(0, 55) + ' — ' + r.p.price + ' F');
  } else {
    const why = r.isVendorProduct
      ? (r.checks.hardViolation || (r.checks.priceVsMedian != null ? 'prix aberrant x' + Number(r.checks.priceVsMedian).toFixed(2) : '?'))
      : 'file modération copilot (import sourcing)';
    print('GARDE  [' + flag + '] ' + String(r.p.name || '').slice(0, 55) + ' — ' + why);
  }
});
print('---');
print('publiés: ' + results.filter(r => r.publish).length + ' / gardés: ' + results.filter(r => !r.publish).length);
