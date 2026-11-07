/**
 * Service Worker - Background script pour l'extension IT Vision
 * Gère la communication entre content script et popup
 * v2.1 — Auto-extract + bulk export + déduplication par tab
 */

// URLs patterns déclenchant l'auto-extract
const PRODUCT_URL_PATTERNS = [
  /^https?:\/\/detail\.1688\.com\/offer\//,
  /^https?:\/\/www\.1688\.com\/offer\//,
  /^https?:\/\/([a-z]+\.)?aliexpress\.com\/item\//,
  /^https?:\/\/([a-z]+\.)?aliexpress\.com\/i\//,
  /^https?:\/\/([a-z]+\.)?alibaba\.com\/product-detail\//,
];

function isProductPage(url) {
  return PRODUCT_URL_PATTERNS.some(p => p.test(url));
}

// Track quels tabs ont déjà été auto-extrait (évite double extraction)
const extractedTabs = new Set();

// Installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[IT Vision] Extension installée v2.1');

  // Initialiser storage
  chrome.storage.local.set({
    products: [],
    settings: {
      apiUrl: 'https://itvisionplus.sn',
      apiToken: '',
      autoExtract: true, // activé par défaut
      autoExport: true,  // envoi auto après extraction
    }
  });
});

// ==========================================
// AUTO-EXTRACT : détecte navigation produit
// ==========================================
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  if (!isProductPage(tab.url)) return;
  if (extractedTabs.has(tabId + '|' + tab.url)) return;

  chrome.storage.local.get('settings', (res) => {
    if (res.settings?.autoExtract === false) return;

    // Marquer comme traité immédiatement pour éviter doubles
    extractedTabs.add(tabId + '|' + tab.url);

    // Attendre que la page soit bien hydratée (React/Vue)
    setTimeout(() => {
      injectAndExtract(tabId, tab.url);
    }, 3500);
  });
});

// Nettoyer le cache quand un tab est fermé ou navigue ailleurs
chrome.tabs.onRemoved.addListener((tabId) => {
  for (const key of extractedTabs) {
    if (key.startsWith(tabId + '|')) extractedTabs.delete(key);
  }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    // Nouvelle URL = on retire l'ancienne entrée pour ce tab
    for (const key of extractedTabs) {
      if (key.startsWith(tabId + '|')) extractedTabs.delete(key);
    }
  }
});

async function injectAndExtract(tabId, url) {
  try {
    // Vérifier si content script répond
    let response;
    try {
      response = await chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_PRODUCT' });
    } catch {
      // Content script absent → injecter
      console.log('[IT Vision] Injection dynamique sur', url);
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content.css']
      });
      await new Promise(r => setTimeout(r, 2000));
      response = await chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_PRODUCT' });
    }

    if (response?.success) {
      chrome.storage.local.get(['products', 'settings'], (result) => {
        const products = result.products || [];
        const exists = products.some(p => p.url === response.data.url);
        if (!exists) {
          products.push(response.data);
          chrome.storage.local.set({ products });

          // Notification discrète seulement en badge
          chrome.action.setBadgeText({ text: String(products.length) });
          chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });

          // Auto-export si activé
          const settings = result.settings || {};
          if (settings.autoExport !== false) {
            setTimeout(() => {
              handleBulkExport(settings.apiUrl, settings.apiToken, true)
                .then((exportResult) => {
                  if (exportResult.success) {
                    console.log('[IT Vision] Auto-export OK:', exportResult.imported, 'créé(s)');
                    chrome.action.setBadgeText({ text: String(exportResult.remaining || 0) });
                  } else {
                    console.warn('[IT Vision] Auto-export échoué:', exportResult.error);
                    chrome.notifications.create({
                      type: 'basic',
                      iconUrl: 'icons/icon128.png',
                      title: 'Export IT Vision échoué',
                      message: exportResult.error || 'Vérifiez la connexion au site et le token.'
                    });
                  }
                })
                .catch(err => {
                  console.warn('[IT Vision] Auto-export error:', err);
                  chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Export IT Vision échoué',
                    message: String(err?.message || err)
                  });
                });
            }, 500);
          }
        }
      });
    }
  } catch (err) {
    console.log('[IT Vision] Auto-extract échoué:', err.message);
  }
}

// ==========================================
// MESSAGES
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PRODUCT_EXTRACTED') {
    // Stocker le produit extrait (manuel ou auto)
    chrome.storage.local.get('products', (result) => {
      const products = result.products || [];

      // Éviter doublons par URL
      const exists = products.some(p => p.url === request.data.url);
      if (!exists) {
        products.push(request.data);
        chrome.storage.local.set({ products });

        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Produit extrait!',
          message: `${(request.data.name || 'Produit').substring(0, 50)}... ajouté.`
        });
      }
    });

    sendResponse({ success: true });
  }

  if (request.action === 'BULK_EXPORT') {
    handleBulkExport(request.apiUrl, request.apiToken, request.useSmart)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'GET_PRODUCTS') {
    chrome.storage.local.get('products', (result) => {
      sendResponse({ success: true, products: result.products || [] });
    });
    return true;
  }

  return true;
});

// ==========================================
// BULK EXPORT (appelé depuis popup ou auto)
// ==========================================
async function handleBulkExport(apiUrl, apiToken, useSmart = true) {
  const cookieUrl = String(apiUrl || 'https://itvisionplus.sn').trim().replace(/\/$/, '');

  const { products = [] } = await chrome.storage.local.get('products');
  if (products.length === 0) {
    return { success: false, error: 'Aucun produit' };
  }

  // Auth: token manuel prioritaire, sinon cookie auth-token
  let token = apiToken;
  if (!token) {
    try {
      const authCookie = await chrome.cookies.get({ url: cookieUrl, name: 'auth-token' });
      if (authCookie?.value) token = authCookie.value;
    } catch {}
  }

  if (!token) {
    return { success: false, error: 'Connectez-vous d\'abord ou renseignez un token API' };
  }

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // Mode standard : import produit par produit via /api/products/import
  if (!useSmart) {
    let imported = 0;
    let firstError = '';
    const remaining = [];
    for (const p of products) {
      try {
        const res = await fetch(`${cookieUrl}/api/products/import`, {
          method: 'POST', headers, credentials: 'omit',
          body: JSON.stringify({ item: transformForStandardApi(p) })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data?.product || data?.success !== false)) {
          imported++;
        } else {
          if (!firstError) firstError = data?.error || `Erreur ${res.status}`;
          remaining.push(p);
        }
      } catch (err) {
        if (!firstError) firstError = err?.message || 'Erreur réseau';
        remaining.push(p);
      }
    }
    await chrome.storage.local.set({ products: remaining });
    if (imported === 0 && remaining.length > 0) {
      return { success: false, error: firstError || 'Import standard échoué' };
    }
    return { success: true, imported, failed: remaining.length, remaining: remaining.length };
  }

  // Transform identique à popup.js
  const payload = {
    products: products.map(p => transformForSmartApi(p)),
    options: { exchangeRate: 85, b2bDiscountPercent: 15, reformatDescriptions: true, filterImages: true }
  };

  // credentials:'omit' — ne PAS envoyer le cookie de session : un cookie présent
  // désactive le bypass Bearer côté CSRF (csrf_origin → 403). Le JWT Bearer suffit.
  const response = await fetch(`${cookieUrl}/api/admin/products/smart-import`, {
    method: 'POST', headers, credentials: 'omit', body: JSON.stringify(payload)
  });

  // Lire le texte d'abord : une réponse HTML (redirection login, 404, CSRF)
  // ferait échouer response.json() avec une erreur illisible.
  const rawText = await response.text();
  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    return {
      success: false,
      error: response.ok
        ? 'Réponse inattendue du serveur (format non JSON)'
        : `Erreur ${response.status} — ${rawText.slice(0, 120) || 'pas de détail'}`
    };
  }

  if (response.ok && result.success !== false) {
    const failedIndexes = new Set(
      Array.isArray(result.results)
        ? result.results.filter(r => !r?.success && Number.isFinite(r?.index)).map(r => Number(r.index))
        : []
    );
    const remaining = failedIndexes.size > 0
      ? products.filter((_, idx) => failedIndexes.has(idx))
      : [];
    await chrome.storage.local.set({ products: remaining });

    return {
      success: true,
      imported: result.imported || 0,
      failed: result.failed || 0,
      remaining: remaining.length
    };
  }

  // Fallback standard
  if (response.status === 403) {
    return { success: false, error: 'Smart Import nécessite ADMIN', code: 'FORBIDDEN' };
  }

  return { success: false, error: result.error || 'Export échoué' };
}

// Format standard /api/products/import (fallback hors smart-import)
function transformForStandardApi(p) {
  const common = {
    productUrl: p.url,
    image: p.image,
    gallery: p.gallery || [],
    descriptionImages: p.descriptionImages || [],
    videos: p.videos || [],
    imageCategories: p.imageCategories || undefined,
    features: p.features || [],
    variantGroups: p.variantGroups || [],
    description: p.description || undefined,
    specifications: p.specifications || {},
    weightKg: p.weightKg || undefined,
    lengthCm: p.lengthCm || undefined,
    widthCm: p.widthCm || undefined,
    heightCm: p.heightCm || undefined,
  };
  if (p.platform === '1688') {
    return {
      ...common,
      name: p.name || 'Produit 1688',
      price1688: p.price1688,
      promoPrice1688: p.promoPrice1688 || undefined,
      price1688Currency: 'CNY',
      exchangeRate: p.exchangeRate || 100,
      currency: 'FCFA',
      category: p.category || 'Catalogue import Chine',
      tagline: p.tagline || 'Import 1688',
      availabilityNote: p.availabilityNote || 'Import 1688 — vérifier poids/dimensions',
      moq: p.moq,
      priceTiers: p.priceTiers || [],
      supplier: p.supplier || undefined,
    };
  }
  if (p.platform === 'alibaba') {
    // Prix source en USD/EUR : sans conversion fiable ici, le produit passe en « sur devis »
    return {
      ...common,
      name: p.name || 'Produit Alibaba',
      price: undefined,
      currency: 'FCFA',
      category: p.category || 'Catalogue import Chine',
      tagline: p.tagline || 'Import Alibaba',
      availabilityNote: p.availabilityNote || 'Import Alibaba — vérifier prix, poids et dimensions',
      shopName: p.shopName,
    };
  }
  return {
    ...common,
    name: p.name || 'Produit AliExpress',
    price: p.price,
    priceUSD: p.priceUSD || undefined,
    baseCost: p.price,
    currency: 'FCFA',
    category: p.category || 'Catalogue import Chine',
    tagline: p.tagline || 'Import AliExpress',
    availabilityNote: p.availabilityNote || 'Import AliExpress — freight 3j/15j/60j',
    shopName: p.shopName,
    orders: p.orders,
    totalRated: p.rating,
  };
}

// Transform identique à popup.js (dupliqué ici pour le background)
function transformForSmartApi(p) {
  const toPositiveNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const normalizeVariantGroups = (groups) => {
    if (!Array.isArray(groups)) return [];
    return groups.map((g, gi) => {
      const groupName = String(g?.name || '').trim();
      if (!groupName) return null;
      const variants = (Array.isArray(g?.variants) ? g.variants : [])
        .map((v, vi) => {
          const name = String(v?.name || '').trim();
          if (!name) return null;
          return {
            id: String(v?.id || `g${gi}-v${vi}`),
            name,
            image: typeof v?.image === 'string' && v.image.startsWith('http') ? v.image : undefined,
            price1688: toPositiveNumber(v?.price1688),
            stock: Number.isFinite(Number(v?.stock)) ? Math.max(0, Number(v.stock)) : 0,
          };
        }).filter(Boolean);
      if (variants.length === 0) return null;
      return { name: groupName, variants };
    }).filter(Boolean);
  };

  const dedupeImages = (images) => {
    const out = [];
    const seen = new Set();
    (images || []).forEach((url) => {
      if (typeof url !== 'string') return;
      // AliExpress sert souvent des URLs protocol-relative (//ae01.alicdn.com/...)
      let normalized = url.trim();
      if (normalized.startsWith('//')) normalized = 'https:' + normalized;
      if (!normalized.startsWith('http')) return;
      normalized = normalized.replace(/_\d+x\d+[^.]*/i, '').trim();
      if (!normalized) return;
      const key = normalized.split('?')[0];
      if (seen.has(key)) return;
      seen.add(key);
      out.push(normalized);
    });
    return out;
  };

  const normalizedVariantGroups = normalizeVariantGroups(p.variantGroups || []);
  const variantImages = normalizedVariantGroups.flatMap(g =>
    (g.variants || []).map(v => v.image).filter(Boolean)
  );
  // Compat : anciennes extractions stockaient p.images au lieu de p.gallery
  const gallery = dedupeImages([...(p.gallery || []), ...(p.images || [])]).slice(0, 20);
  const descriptionImages = dedupeImages(p.descriptionImages || []).slice(0, 30);
  const images = dedupeImages([...gallery, ...descriptionImages, ...variantImages]).slice(0, 10);

  const lengthCm = toPositiveNumber(p.lengthCm);
  const widthCm = toPositiveNumber(p.widthCm);
  const heightCm = toPositiveNumber(p.heightCm);
  const hasDimensions = Boolean(lengthCm && widthCm && heightCm);
  const volumeM3 = hasDimensions ? Number(((lengthCm * widthCm * heightCm) / 1000000).toFixed(4)) : undefined;

  return {
    name: p.name || 'Produit',
    description: p.description || Object.entries(p.specifications || {}).map(([k, v]) => `${k}: ${v}`).join('\n') || '',
    images,
    gallery,
    descriptionImages,
    videos: p.videos || [],
    price1688: p.price1688 || undefined,
    // 1688 : CNY ; Alibaba : USD (ou EUR sur fr.alibaba.com), converti côté serveur
    price1688Currency: p.price1688 ? (p.price1688Currency || (p.platform === 'alibaba' ? 'USD' : 'CNY')) : undefined,
    promoPrice1688: p.promoPrice1688 || undefined,
    price: p.price || undefined,
    priceTiers: p.priceTiers || [],
    category: p.category || 'Catalogue import Chine',
    features: p.features || [],
    variants: normalizedVariantGroups.flatMap(g =>
      (g.variants || []).map(v => ({ id: v.id, name: v.name, image: v.image, price1688: v.price1688, groupName: g.name }))
    ),
    variantGroups: normalizedVariantGroups,
    weightKg: p.weightKg || undefined,
    lengthCm: hasDimensions ? lengthCm : undefined,
    widthCm: hasDimensions ? widthCm : undefined,
    heightCm: hasDimensions ? heightCm : undefined,
    volumeM3,
    sourceUrl: p.url,
    sourcePlatform: p.platform === '1688' || p.platform === 'alibaba' ? p.platform : 'aliexpress',
    supplierName: p.shopName || p.supplier?.name || undefined,
    moq: p.moq || undefined,
    specifications: p.specifications || {},
  };
}

// Badge
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.products) {
    const count = changes.products.newValue?.length || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
  }
});

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'extract-product',
    title: 'Extraire produit IT Vision',
    contexts: ['page'],
    documentUrlPatterns: [
      '*://detail.1688.com/*',
      '*://*.aliexpress.com/item/*',
      '*://*.alibaba.com/product-detail/*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extract-product') {
    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT' });
  }
});

