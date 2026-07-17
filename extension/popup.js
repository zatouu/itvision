/**
 * Popup - Interface utilisateur de l'extension IT Vision
 */

async function initPopup() {
  // Éléments DOM
  const btnExtract = document.getElementById('btn-extract');
  const btnExport = document.getElementById('btn-export');
  const btnClear = document.getElementById('btn-clear');
  const countEl = document.getElementById('count');
  const productsContainer = document.getElementById('products-container');
  const productsList = document.getElementById('products-list');
  const apiUrlInput = document.getElementById('api-url');
  const apiTokenInput = document.getElementById('api-token');
  const autoExtractToggle = document.getElementById('auto-extract');

  // Charger settings
  const settings = await chrome.storage.local.get(['apiUrl', 'apiToken', 'settings']);
  if (settings.apiUrl) apiUrlInput.value = settings.apiUrl;
  if (settings.apiToken) apiTokenInput.value = settings.apiToken;
  const storedSettings = settings.settings || {};
  if (autoExtractToggle) {
    autoExtractToggle.checked = storedSettings.autoExtract !== false;
  }

  // Sauvegarder settings
  const saveSettings = () => {
    chrome.storage.local.set({
      apiUrl: apiUrlInput.value,
      apiToken: apiTokenInput.value,
      settings: {
        apiUrl: apiUrlInput.value,
        apiToken: apiTokenInput.value,
        autoExtract: autoExtractToggle ? autoExtractToggle.checked : true
      }
    });
  };
  apiUrlInput.addEventListener('change', saveSettings);
  apiTokenInput.addEventListener('change', saveSettings);
  if (autoExtractToggle) {
    autoExtractToggle.addEventListener('change', saveSettings);
  }

  // Charger produits extraits
  const loadProducts = async () => {
    const { products = [] } = await chrome.storage.local.get('products');
    countEl.textContent = products.length;
    btnExport.disabled = products.length === 0;
    
    if (products.length > 0) {
      productsContainer.style.display = 'block';
      renderProducts(products);
    } else {
      productsContainer.style.display = 'none';
      productsList.innerHTML = '';
    }
  };

  // Score de confiance / qualité d'extraction
  const getConfidence = (p) => {
    let score = 100;
    const warnings = [];
    if (!p.name || p.name.length < 3 || /produit (1688|aliexpress)/i.test(p.name)) { score -= 25; warnings.push('nom douteux'); }
    if (!(p.price1688 > 0 || p.price > 0)) { score -= 20; warnings.push('prix manquant'); }
    if (!(p.image && p.gallery?.length > 0)) { score -= 20; warnings.push('images manquantes'); }
    if (!p.weightKg) { score -= 10; warnings.push('poids manquant'); }
    if (!(p.lengthCm && p.widthCm && p.heightCm)) { score -= 8; warnings.push('dimensions manquantes'); }
    if (!p.category || p.category === 'Catalogue import Chine') { score -= 10; warnings.push('catégorie non détectée'); }
    if (!(p.description && p.description.length > 20)) { score -= 7; warnings.push('description courte'); }
    return { score: Math.max(0, score), warnings };
  };

  // Render liste produits
  const renderProducts = (products) => {
    productsList.innerHTML = products.map((p, idx) => {
      const imgCount = (p.gallery?.length || 0) + (p.descriptionImages?.length || 0);
      const varCount = (p.variantGroups || []).reduce((acc, g) => acc + (g.variants?.length || 0), 0);
      const videoCount = p.videos?.length || 0;
      const conf = getConfidence(p);
      const confColor = conf.score >= 80 ? '#10b981' : (conf.score >= 50 ? '#f59e0b' : '#ef4444');
      const stats = [
        imgCount > 0 && `${imgCount} img`,
        varCount > 0 && `${varCount} var`,
        videoCount > 0 && `${videoCount} vid`,
        p.weightKg && `${p.weightKg}kg`
      ].filter(Boolean).join(' · ');
      return `
      <div class="product-item" data-idx="${idx}">
        <img src="${p.image || 'icons/icon48.png'}" onerror="this.src='icons/icon48.png'" alt="">
        <div class="product-info">
          <div class="product-name">${p.name || 'Produit sans nom'}</div>
          <div class="product-price">${p.price1688 ? '¥' + p.price1688 : (p.price ? p.price + ' FCFA' : 'Prix non disponible')}</div>
          <div style="font-size:10px;color:${confColor};margin-top:2px">Confiance ${conf.score}% ${conf.warnings.length ? `· ${conf.warnings.slice(0, 2).join(', ')}` : ''}</div>
          ${stats ? `<div style="font-size:10px;color:#6b7280;margin-top:1px">${stats}</div>` : ''}
        </div>
        <button class="product-remove" data-idx="${idx}" title="Supprimer">×</button>
      </div>`;
    }).join('');

    // Listeners suppression
    document.querySelectorAll('.product-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const { products = [] } = await chrome.storage.local.get('products');
        products.splice(idx, 1);
        await chrome.storage.local.set({ products });
        loadProducts();
      });
    });
  };

  // Extraire produit de la page active
  btnExtract.addEventListener('click', async () => {
    btnExtract.disabled = true;
    btnExtract.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <path d="M12 3v18M3 12h18"/>
      </svg>
      Extraction...
    `;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('1688.com') && !tab.url.includes('aliexpress.com')) {
        showNotification('Veuillez ouvrir une page 1688 ou AliExpress', 'error');
        return;
      }

      // Essayer d'envoyer au content script existant, sinon l'injecter dynamiquement
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT' });
      } catch (e) {
        // Content script pas chargé — l'injecter manuellement
        console.log('[IT Vision] Content script absent, injection dynamique...');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
          world: 'ISOLATED'
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        });
        // Attendre que le script s'initialise (le listener s'enregistre en synchrone)
        await new Promise(r => setTimeout(r, 500));
        response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT' });
      }
      
      if (response && response.success) {
        // Ajouter aux produits
        const { products = [] } = await chrome.storage.local.get('products');
        
        // Éviter doublons
        const exists = products.some(p => p.url === response.data.url);
        if (exists) {
          showNotification('Produit déjà extrait!', 'error');
          return;
        }
        
        products.push(response.data);
        await chrome.storage.local.set({ products });
        
        loadProducts();
        showNotification('Produit extrait avec succès!', 'success');
      } else {
        showNotification('Erreur: ' + response.error, 'error');
      }
    } catch (err) {
      showNotification('Erreur extraction: ' + err.message, 'error');
    } finally {
      btnExtract.disabled = false;
      btnExtract.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v18M3 12h18"/>
        </svg>
        Extraire cette page
      `;
    }
  });

  // Format standard /api/products/import (fallback)
  const transformProductForApi = (p) => {
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
  };

  const toPositiveNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const isLikelyValidImageUrl = (url) => {
    if (typeof url !== 'string') return false;
    const value = url.trim();
    if (!value || !/^https?:\/\//i.test(value)) return false;
    const lower = value.toLowerCase();
    if (/paypal|klarna|afterpay|clearpay|payment|badge|banner|coupon|promo|logo|watermark|qrcode|icon|avatar|review|feedback|recommend/i.test(lower)) return false;
    if (/\.svg($|\?)/i.test(lower)) return false;
    return /\.(jpe?g|png|webp)(\?|$)/i.test(lower) || /alicdn|aliexpress|1688|imgextra/i.test(lower);
  };

  const dedupeImages = (images) => {
    const out = [];
    const seen = new Set();
    (images || []).forEach((url) => {
      if (!isLikelyValidImageUrl(url)) return;
      const normalized = String(url).replace(/_\d+x\d+[^.]*/i, '').trim();
      if (!normalized) return;
      const key = normalized.split('?')[0];
      if (seen.has(key)) return;
      seen.add(key);
      out.push(normalized);
    });
    return out;
  };

  const normalizeVariantGroups = (groups) => {
    if (!Array.isArray(groups)) return [];
    return groups
      .map((g, gi) => {
        const groupName = String(g?.name || '').trim();
        if (!groupName) return null;
        const variants = (Array.isArray(g?.variants) ? g.variants : [])
          .map((v, vi) => {
            const name = String(v?.name || '').trim();
            if (!name) return null;
            return {
              id: String(v?.id || `g${gi}-v${vi}`),
              name,
              image: isLikelyValidImageUrl(v?.image) ? v.image : undefined,
              price1688: toPositiveNumber(v?.price1688),
              stock: Number.isFinite(Number(v?.stock)) ? Math.max(0, Number(v.stock)) : 0,
              isDefault: Boolean(v?.isDefault) || vi === 0
            };
          })
          .filter(Boolean);
        if (variants.length === 0) return null;
        return { name: groupName, variants };
      })
      .filter(Boolean);
  };

  // Format smart-import /api/admin/products/smart-import (enrichi IA + pricing auto)
  const transformProductForSmartApi = (p) => {
    const normalizedVariantGroups = normalizeVariantGroups(p.variantGroups || []);
    const variantImages = normalizedVariantGroups.flatMap(g =>
      (g.variants || []).map(v => v.image).filter(Boolean)
    );
    const gallery = dedupeImages(p.gallery || []).slice(0, 20);
    const descriptionImages = dedupeImages(p.descriptionImages || []).slice(0, 30);
    const images = dedupeImages([
      ...gallery,
      ...descriptionImages,
      ...variantImages,
      ...((p.imageCategories?.description || [])),
      ...((p.imageCategories?.gallery || [])),
      ...((p.imageCategories?.variant || []))
    ]).slice(0, 20);

    const lengthCm = toPositiveNumber(p.lengthCm);
    const widthCm = toPositiveNumber(p.widthCm);
    const heightCm = toPositiveNumber(p.heightCm);
    const hasDimensions = Boolean(lengthCm && widthCm && heightCm);
    const volumeM3 = hasDimensions ? Number(((lengthCm * widthCm * heightCm) / 1000000).toFixed(4)) : undefined;

    return {
      name: p.name || 'Produit',
      description: p.description || Object.entries(p.specifications || {}).map(([k,v]) => `${k}: ${v}`).join('\n') || '',
      images,
      gallery,
      descriptionImages,
      imageCategories: p.imageCategories || undefined,
      videos: p.videos || [],
      price1688: p.price1688 || undefined,
      promoPrice1688: p.promoPrice1688 || undefined,
      price: p.price || undefined,
      priceTiers: p.priceTiers || [],
      category: p.category || 'Catalogue import Chine',
      features: p.features || [],
      variants: normalizedVariantGroups.flatMap(g =>
        (g.variants || []).map(v => ({
          id: v.id,
          name: v.name,
          image: v.image,
          price1688: v.price1688,
          groupName: g.name
        }))
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
  };

  // Exporter vers API IT Vision (via background script pour ne pas bloquer le popup)
  const doExport = async (useSmart) => {
    const apiUrl = apiUrlInput.value.trim();
    if (!apiUrl) { showNotification('Veuillez configurer l\'URL API', 'error'); return; }

    const { products = [] } = await chrome.storage.local.get('products');
    if (products.length === 0) { showNotification('Aucun produit à exporter', 'error'); return; }

    // Validation : avertir si certains produits manquent d'infos critiques
    const lowConfidence = products.filter(p => getConfidence(p).score < 50);
    if (lowConfidence.length > 0) {
      const ok = confirm(`${lowConfidence.length} produit(s) ont des infos incomplètes (prix, images, poids...). Exporter quand même ?`);
      if (!ok) return;
    }

    // Déléguer au background script (plus robuste, pas de timeout popup)
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'BULK_EXPORT',
        apiUrl,
        apiToken: apiTokenInput.value,
        useSmart
      });

      if (!result) {
        showNotification('Erreur: pas de réponse du background', 'error');
        return;
      }

      if (result.success) {
        loadProducts();
        showNotification(
          `${result.imported || 0} créé(s) — ${result.remaining || 0} en attente`,
          'success'
        );
      } else if (result.code === 'FORBIDDEN') {
        showNotification('Smart Import nécessite le rôle ADMIN. Tentative import standard...', 'error');
        setTimeout(() => doExport(false), 800);
      } else {
        showNotification('Erreur: ' + (result.error || 'Export échoué'), 'error');
      }
    } catch (err) {
      showNotification('Erreur export: ' + err.message, 'error');
    }
  };

  btnExport.addEventListener('click', async () => {
    btnExport.disabled = true;
    const label = btnExport.textContent.trim();
    btnExport.textContent = 'Export...';
    try {
      // Smart Import par défaut (pricing + IA)
      await doExport(true);
    } finally {
      btnExport.disabled = false;
      btnExport.textContent = label;
    }
  });

  // Vider la liste
  btnClear.addEventListener('click', async () => {
    if (confirm('Vider tous les produits extraits?')) {
      await chrome.storage.local.set({ products: [] });
      loadProducts();
      showNotification('Liste vidée', 'success');
    }
  });

  // Notification helper
  const showNotification = (message, type) => {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transition = 'opacity 0.3s';
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  };

  // Initial load
  loadProducts();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}

// Animation CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spin {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(style);
