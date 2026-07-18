/**
 * Service Worker - Background script pour l'extension IT Vision
 * Gère la communication entre content script et popup
 * v2.1 — Auto-extract + bulk export + déduplication par tab
 */

// URLs patterns déclenchant l'auto-extract
const PRODUCT_URL_PATTERNS = [
  /^https?:\/\/detail\.1688\.com\/offer\//,
  /^https?:\/\/www\.1688\.com\/offer\//,
  /^https?:\/\/www\.aliexpress\.com\/item\//,
  /^https?:\/\/www\.aliexpress\.com\/i\//,
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
      // Stocker silencieusement (pas de notification pour auto-extract, trop intrusif)
      chrome.storage.local.get('products', (result) => {
        const products = result.products || [];
        const exists = products.some(p => p.url === response.data.url);
        if (!exists) {
          products.push(response.data);
          chrome.storage.local.set({ products });

          // Notification discrète seulement en badge
          chrome.action.setBadgeText({ text: String(products.length) });
          chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
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
  const cookieUrl = apiUrl.replace(/\/$/, '');

  const { products = [] } = await chrome.storage.local.get('products');
  if (products.length === 0) {
    return { success: false, error: 'Aucun produit' };
  }

  // Auth via cookie
  let authCookie = null;
  try { authCookie = await chrome.cookies.get({ url: cookieUrl, name: 'auth-token' }); } catch {}
  if (!authCookie?.value) {
    return { success: false, error: 'Connectez-vous d\'abord' };
  }

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authCookie.value}` };

  // Transform identique à popup.js
  const payload = {
    products: products.map(p => transformForSmartApi(p)),
    options: { exchangeRate: 85, b2bDiscountPercent: 15, reformatDescriptions: false }
  };

  const response = await fetch(`${cookieUrl}/api/admin/products/smart-import`, {
    method: 'POST', headers, credentials: 'include', body: JSON.stringify(payload)
  });
  const result = await response.json();

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
      if (typeof url !== 'string' || !url.startsWith('http')) return;
      const normalized = url.replace(/_\d+x\d+[^.]*/i, '').trim();
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
  const gallery = dedupeImages(p.gallery || []).slice(0, 20);
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
    sourcePlatform: p.platform === '1688' ? '1688' : 'aliexpress',
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
      '*://www.aliexpress.com/item/*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extract-product') {
    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT' });
  }
});

