/**
 * Content Script - Extraction données produit depuis 1688 et AliExpress
 * Injecté automatiquement sur les pages produits
 */

(function() {
  'use strict';

  // Éviter double injection
  if (window.itVisionScraperInjected) return;
  window.itVisionScraperInjected = true;

  console.log('[IT Vision] Scraper actif sur', window.location.hostname);

  // ==========================================
  // UTILITAIRES
  // ==========================================
  
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  
  const trySelectors = (selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return el.textContent.trim();
      }
    }
    return null;
  };

  const extractImages = (selectors) => {
    const images = new Set();
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original');
        if (src && !src.includes('lazy') && !src.includes('blank')) {
          images.add(src.replace(/_\d+x\d+/, ''));
        }
      });
    }
    return Array.from(images);
  };

  // ==========================================
  // EXTRACTEUR 1688
  // ==========================================
  
  const scrape1688 = async () => {
    console.log('[IT Vision] Extraction 1688...');
    
    // Attendre chargement complet (1688 charge en plusieurs étapes)
    await wait(2000);
    
    // Scroll progressif pour charger images et contenu lazy-loaded
    for (let y = 0; y <= 2000; y += 400) {
      window.scrollTo(0, y);
      await wait(300);
    }
    window.scrollTo(0, 0);
    await wait(300);

    const data = {
      platform: '1688',
      url: window.location.href.split('?')[0], // URL propre sans tracking params
      timestamp: new Date().toISOString()
    };

    // Titre (nombreux fallbacks car 1688 change souvent le DOM)
    try {
      data.name = trySelectors([
        '.offer-title',
        '.detail-title',
        'h1[data-spm="title"]',
        'h1.title',
        '.title-text',
        '.mod-detail-title h1',
        '[class*="offerTitle"]',
        '[class*="DetailTitle"]',
        'h1'
      ]) || document.title.replace(/[-|].*$/, '').trim() || 'Produit 1688';
    } catch (e) {
      data.name = document.title.replace(/[-|].*$/, '').trim() || 'Produit 1688';
    }

    // Prix (extraction plus robuste avec regex sur tout le contenu visible)
    try {
      const priceEl = document.querySelector(
        '.price-now .price-num, .price .price-num, .offer-price, ' +
        '[class*="price"] [class*="num"], [class*="Price"] [class*="Num"], ' +
        '.mod-detail-price .price, [data-price]'
      );
      const priceMatch = priceEl?.textContent?.match(/(\d+(?:\.\d+)?)/);
      data.price1688 = priceMatch ? parseFloat(priceMatch[1]) : null;
      // Essayer aussi d'extraire les prix par paliers
      const priceTiers = [];
      document.querySelectorAll('[class*="price"] tr, [class*="Price"] tr, .price-range-item, .batch-price-item').forEach(row => {
        const texts = row.textContent || '';
        const qtyMatch = texts.match(/(\d+)\s*[-~≥]\s*(\d+)?/);
        const prMatch = texts.match(/¥?\s*(\d+(?:\.\d+)?)/);
        if (qtyMatch && prMatch) {
          priceTiers.push({
            minQty: parseInt(qtyMatch[1]),
            maxQty: qtyMatch[2] ? parseInt(qtyMatch[2]) : undefined,
            price: parseFloat(prMatch[1])
          });
        }
      });
      if (priceTiers.length > 0) data.priceTiers = priceTiers;
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction prix:', e);
    }

    // Images (plus de sélecteurs)
    try {
      data.gallery = extractImages([
        '.detail-gallery img',
        '.offer-img img',
        '.main-image img',
        '.tab-content img',
        '[class*="gallery"] img',
        '[class*="slider"] img',
        '[class*="thumb"] img',
        '.detail-desc img'
      ]);
      // Fallback: og:image
      if (data.gallery.length === 0) {
        const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (ogImg) data.gallery = [ogImg];
      }
      data.image = data.gallery[0];
    } catch (e) {
      data.gallery = [];
      console.warn('[IT Vision] Erreur extraction images:', e);
    }

    // Variantes (plus de sélecteurs)
    try {
      const variants = [];
      const variantSelectors = '.sku-item, .offer-sku, .prop-item, [class*="sku"] li, [class*="Sku"] li, [class*="variant"] li';
      document.querySelectorAll(variantSelectors).forEach((item, idx) => {
        const name = item.textContent?.trim();
        const img = item.querySelector('img')?.getAttribute('src') || item.querySelector('img')?.getAttribute('data-src');
        if (name && name.length > 0 && name.length < 80) {
          variants.push({ id: `sku-${idx}`, name, image: img || undefined, isDefault: idx === 0 });
        }
      });
      if (variants.length > 0) {
        data.variantGroups = [{ name: 'Modèle', variants }];
      }
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction variantes:', e);
    }

    // MOQ (extraction robuste)
    try {
      const moqSelectors = '.moq-info, [class*="moq"], .min-order, [class*="MinOrder"], [class*="minOrder"]';
      const moqEl = document.querySelector(moqSelectors);
      if (moqEl) {
        const moqMatch = moqEl.textContent.match(/(\d+)\s*(?:件|个|pcs|pi[eè]ces?|unit)/i);
        data.moq = moqMatch ? parseInt(moqMatch[1]) : null;
      }
      // Fallback: chercher dans le texte général
      if (!data.moq) {
        const bodyText = document.body.innerText.slice(0, 5000);
        const moqFallback = bodyText.match(/(?:起订|最少|minimum)[^\d]*(\d+)/i);
        if (moqFallback) data.moq = parseInt(moqFallback[1]);
      }
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction MOQ:', e);
    }

    // Fournisseur
    try {
      const supplierName = document.querySelector(
        '.company-name, .supplier-name, [class*="company"], [class*="Company"], [class*="shopName"], [class*="StoreName"]'
      )?.textContent?.trim();
      if (supplierName && supplierName.length < 100) {
        data.supplier = {
          name: supplierName,
          location: document.querySelector('.company-location, [class*="location"], [class*="Location"]')?.textContent?.trim() || 'Chine',
          verified: document.querySelector('[class*="verified"], [class*="Verified"], [class*="trust"]') !== null
        };
      }
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction fournisseur:', e);
    }

    // Spécifications
    try {
      data.specifications = {};
      document.querySelectorAll('.offer-attr-row, .parameter-row, [class*="attr"] tr, [class*="Attr"] tr, [class*="param"] tr').forEach(row => {
        const cells = row.querySelectorAll('td, .attr-name, .attr-value, th');
        if (cells.length >= 2) {
          const key = cells[0].textContent?.trim();
          const value = cells[1].textContent?.trim();
          if (key && value && key.length < 50 && value.length < 200) {
            data.specifications[key] = value;
          }
        }
      });
    } catch (e) {
      data.specifications = {};
      console.warn('[IT Vision] Erreur extraction spécifications:', e);
    }

    // Extraire poids/dimensions depuis les spécifications
    let weightKg = 1, lengthCm = 10, widthCm = 10, heightCm = 10;
    try {
      const specs = Object.entries(data.specifications || {});
      for (const [key, value] of specs) {
        const k = key.toLowerCase();
        if (k.includes('重量') || k.includes('weight')) {
          const wm = String(value).match(/(\d+(?:\.\d+)?)\s*(?:kg|千克)/i);
          if (wm) weightKg = parseFloat(wm[1]);
          const wg = String(value).match(/(\d+(?:\.\d+)?)\s*(?:g|克)/i);
          if (wg && !wm) weightKg = parseFloat(wg[1]) / 1000;
        }
        if (k.includes('尺寸') || k.includes('dimension') || k.includes('size')) {
          const dims = String(value).match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
          if (dims) {
            lengthCm = parseFloat(dims[1]);
            widthCm = parseFloat(dims[2]);
            heightCm = parseFloat(dims[3]);
          }
        }
      }
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction poids/dimensions:', e);
    }

    // Valeurs par défaut
    data.category = 'Catalogue import Chine';
    data.tagline = 'Import 1688';
    data.availabilityNote = 'Import 1688 - vérifier poids/dimensions';
    data.currency = 'FCFA';
    data.price1688Currency = 'CNY';
    data.exchangeRate = 100;
    data.weightKg = weightKg;
    data.lengthCm = lengthCm;
    data.widthCm = widthCm;
    data.heightCm = heightCm;
    data.features = [
      data.moq && `MOQ: ${data.moq} unités`,
      data.supplier?.name && `Fournisseur: ${data.supplier.name}`,
      data.priceTiers?.length && `${data.priceTiers.length} paliers de prix`,
      Object.keys(data.specifications || {}).length > 0 && `${Object.keys(data.specifications).length} spécifications`
    ].filter(Boolean);

    console.log('[IT Vision] 1688 extrait:', data);
    return data;
  };

  // ==========================================
  // EXTRACTEUR ALIEXPRESS
  // ==========================================
  
  const scrapeAliExpress = async () => {
    console.log('[IT Vision] Extraction AliExpress...');
    
    // Attendre chargement dynamique
    await wait(2000);
    
    // Scroll pour déclencher lazy load
    window.scrollTo(0, 800);
    await wait(800);

    const data = {
      platform: 'aliexpress',
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Titre
    data.name = trySelectors([
      '[data-pl="product-title"]',
      'h1[data-pl="product-title"]',
      '.product-title',
      'h1'
    ]) || 'Produit AliExpress';

    // Prix
    const priceSelectors = [
      '[data-pl="product-price"]',
      '.product-price-value',
      '[class*="price"] [class*="current"]',
      '.price-current'
    ];
    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        const match = el.textContent.replace(/[^\d.,]/g, '').replace(',', '.').match(/(\d+(?:\.\d+)?)/);
        if (match) {
          data.priceUSD = parseFloat(match[1]);
          data.price = Math.round(data.priceUSD * 620); // Conversion FCFA
          break;
        }
      }
    }

    // Images
    data.gallery = extractImages([
      '.gallery-image',
      '.magnifier-image img',
      '[class*="gallery"] img',
      '.image-viewer img'
    ]);
    data.image = data.gallery[0];

    // Boutique
    data.shopName = document.querySelector('.shop-name, .store-name, [class*="shop"]')?.textContent?.trim();

    // Rating
    const ratingEl = document.querySelector('.rating-value, [class*="rating"]');
    if (ratingEl?.textContent) {
      const match = ratingEl.textContent.match(/(\d\.\d)/);
      data.rating = match ? parseFloat(match[1]) : null;
    }

    // Commandes
    const ordersEl = document.querySelector('[class*="orders"], [class*="sold"]');
    if (ordersEl?.textContent) {
      const match = ordersEl.textContent.replace(/[^\d]/g, '').match(/(\d+)/);
      data.orders = match ? parseInt(match[1]) : null;
    }

    // Variantes
    const variants = [];
    document.querySelectorAll('.sku-item, .product-sku, [class*="variant"]').forEach(item => {
      const name = item.textContent?.trim();
      const img = item.querySelector('img')?.getAttribute('src');
      if (name && !variants.find(v => v.name === name)) {
        variants.push({ name, image: img });
      }
    });
    if (variants.length > 0) data.variants = variants;

    // Description
    try {
      const descSelectors = [
        '[class*="product-description"]', '[class*="ProductDescription"]',
        '[class*="detail-desc"]', '[class*="DetailDesc"]',
        '[data-pl="product-description"]',
        '.product-overview', '[class*="overview"]',
        '[class*="specification"] table', '[class*="Specification"]',
        '#product-description', '.description-content'
      ];
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const text = el.innerText?.trim();
          if (text && text.length > 20) {
            data.description = text.replace(/\n{3,}/g, '\n\n').replace(/\t/g, ' ').slice(0, 2000).trim();
            break;
          }
        }
      }
      // Fallback: utiliser les specs comme description
      if (!data.description) {
        const specItems = [];
        document.querySelectorAll('[class*="specification"] tr, [class*="property"] .property-item, [class*="attr"] li').forEach(row => {
          const text = row.textContent?.trim();
          if (text && text.length > 3 && text.length < 200) specItems.push(text);
        });
        if (specItems.length > 0) data.description = specItems.join('\n');
      }
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction description:', e);
    }

    // Features
    data.features = [
      data.rating && `Note: ${data.rating}/5`,
      data.orders && `${data.orders} commandes`,
      data.shopName && `Boutique: ${data.shopName}`
    ].filter(Boolean);

    // Valeurs par défaut
    data.category = 'Catalogue import Chine';
    data.tagline = 'Import AliExpress';
    data.availabilityNote = 'Import AliExpress - freight 3j/15j/60j';
    data.currency = 'FCFA';
    data.weightKg = 1;

    console.log('[IT Vision] AliExpress extrait:', data);
    return data;
  };

  // ==========================================
  // UI FLOATING BUTTON
  // ==========================================
  
  const createFloatingButton = () => {
    const btn = document.createElement('div');
    btn.id = 'itvision-scraper-btn';
    btn.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: white;
        padding: 12px 20px;
        border-radius: 50px;
        cursor: pointer;
        font-family: system-ui, sans-serif;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v18M3 12h18"/>
        </svg>
        Importer IT Vision
      </div>
    `;
    
    btn.onclick = async () => {
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => btn.style.transform = 'scale(1)', 150);
      
      const is1688 = window.location.hostname.includes('1688.com');
      const data = is1688 ? await scrape1688() : await scrapeAliExpress();
      
      // Envoyer au background script
      chrome.runtime.sendMessage({
        action: 'PRODUCT_EXTRACTED',
        data: data
      });
      
      // Feedback visuel
      showNotification(`${data.name.substring(0, 30)}... extrait!`);
    };
    
    document.body.appendChild(btn);
  };

  const showNotification = (message) => {
    const notif = document.createElement('div');
    notif.innerHTML = `
      <div style="
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 999999;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
      ">
        ✅ ${message}
      </div>
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  };

  // ==========================================
  // LISTENERS
  // ==========================================
  
  // Écouter messages du popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PRODUCT') {
      const is1688 = window.location.hostname.includes('1688.com');
      
      (is1688 ? scrape1688() : scrapeAliExpress())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      
      return true; // Async response
    }
  });

  // Injecter bouton flottant après chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingButton);
  } else {
    createFloatingButton();
  }

})();
